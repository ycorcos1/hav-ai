import type { Workout, WorkoutExercise, WorkoutSet } from "@/shared/contracts";

import {
  workoutExerciseFromRow,
  workoutExerciseToRow,
  workoutFromRow,
  workoutSetFromRow,
  workoutSetToRow,
  workoutToRow,
} from "../mappers";
import type {
  LocalWorkoutExerciseRow,
  LocalWorkoutRow,
  LocalWorkoutSetRow,
} from "../mappers";
import type {
  LocalDatabaseTransaction,
  TransactionalLocalDatabaseConnection,
} from "../types";
import { metadataForUpsert, placeholders } from "./repositoryUtils";
import { enqueueSyncUpsert } from "./syncQueueUtils";
import type { LocalWorkoutRepository } from "./types";

const workoutColumns = ["id", "user_id", "source_template_id", "name", "status", "started_at", "completed_at", "notes", "sync_status", "created_at", "updated_at", "server_updated_at"];
const exerciseColumns = ["id", "user_id", "workout_id", "exercise_id", "position", "target_sets", "target_min_reps", "target_max_reps", "target_weight_kg", "source_recommendation_id", "notes", "sync_status", "created_at", "updated_at", "server_updated_at"];
const setColumns = ["id", "user_id", "workout_id", "workout_exercise_id", "exercise_id", "position", "set_type", "weight_kg", "reps", "rpe", "notes", "completed_at", "sync_status", "deleted_at", "created_at", "updated_at", "server_updated_at"];

export class SQLiteLocalWorkoutRepository implements LocalWorkoutRepository {
  constructor(private readonly database: TransactionalLocalDatabaseConnection) {}

  async getById(userId: string, id: string): Promise<Workout | null> {
    const row = await this.database.getFirstAsync<LocalWorkoutRow>(
      "SELECT * FROM local_workouts WHERE id = ? AND user_id = ?;", id, userId,
    );
    return row ? this.hydrate(row, userId) : null;
  }

  async getActiveForUser(userId: string): Promise<Workout | null> {
    const row = await this.database.getFirstAsync<LocalWorkoutRow>(
      `SELECT * FROM local_workouts WHERE user_id = ? AND status = 'active'
       ORDER BY started_at DESC LIMIT 1;`, userId,
    );
    return row ? this.hydrate(row, userId) : null;
  }

  async create(workout: Workout): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const active = await transaction.getFirstAsync<{ id: string }>(
        "SELECT id FROM local_workouts WHERE user_id=? AND status='active' LIMIT 1;",
        workout.userId,
      );
      if (active && active.id !== workout.id) {
        throw new Error("An active workout already exists for this user.");
      }
      await this.saveInTransaction(transaction, workout);
      await enqueueSyncUpsert(transaction, "workout", workout.id, workout.createdAt);
      for (const exercise of workout.exercises) {
        await enqueueSyncUpsert(transaction, "workout_exercise", exercise.id, exercise.createdAt);
        if (!exercise.sourceRecommendationId) continue;
        const recommendation = await transaction.getFirstAsync<{
          exercise_id: string;
          status: string;
          user_id: string;
        }>(
          "SELECT user_id, exercise_id, status FROM local_progression_recommendations WHERE id=?;",
          exercise.sourceRecommendationId,
        );
        if (
          !recommendation
          || recommendation.user_id !== workout.userId
          || recommendation.exercise_id !== exercise.exerciseId
          || recommendation.status !== "active"
        ) {
          throw new Error("Workout recommendation snapshot is not active or accessible.");
        }
        await transaction.runAsync(
          `UPDATE local_progression_recommendations
           SET status='consumed', consumed_at=?, updated_at=?,
             sync_status=CASE WHEN sync_status='pending_create' THEN 'pending_create' ELSE 'pending_update' END
           WHERE id=? AND user_id=?;`,
          workout.startedAt,
          workout.startedAt,
          exercise.sourceRecommendationId,
          workout.userId,
        );
        await enqueueSyncUpsert(
          transaction,
          "progression_recommendation",
          exercise.sourceRecommendationId,
          workout.createdAt,
        );
      }
    });
  }
  async update(workout: Workout): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await this.saveInTransaction(transaction, workout);
      await enqueueSyncUpsert(transaction, "workout", workout.id, workout.updatedAt);
      for (const exercise of workout.exercises) {
        await enqueueSyncUpsert(transaction, "workout_exercise", exercise.id, workout.updatedAt);
      }
    });
  }

  private async hydrate(row: LocalWorkoutRow, userId: string): Promise<Workout> {
    const exerciseRows = await this.database.getAllAsync<LocalWorkoutExerciseRow>(
      "SELECT * FROM local_workout_exercises WHERE workout_id = ? AND user_id = ? ORDER BY position;",
      row.id, userId,
    );
    const exercises: WorkoutExercise[] = [];
    for (const exerciseRow of exerciseRows) {
      const setRows = await this.database.getAllAsync<LocalWorkoutSetRow>(
        `SELECT * FROM local_sets WHERE workout_exercise_id = ? AND user_id = ?
         AND deleted_at IS NULL ORDER BY position;`, exerciseRow.id, userId,
      );
      exercises.push(workoutExerciseFromRow(exerciseRow, setRows.map(workoutSetFromRow)));
    }
    return workoutFromRow(row, exercises);
  }

  private async save(workout: Workout): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await this.saveInTransaction(transaction, workout);
    });
  }

  private async saveInTransaction(
    transaction: LocalDatabaseTransaction,
    workout: Workout,
  ): Promise<void> {
    const existing = await transaction.getFirstAsync<{ user_id: string }>(
      "SELECT user_id FROM local_workouts WHERE id=?;", workout.id,
    );
    if (existing && existing.user_id !== workout.userId) return;
    await saveWorkoutRow(transaction, workout);
    for (const exercise of workout.exercises) {
      if (exercise.userId !== workout.userId || exercise.workoutId !== workout.id) {
        throw new Error("Workout exercise ownership or ancestry does not match its workout.");
      }
      await saveWorkoutExerciseRow(transaction, exercise);
      for (const set of exercise.sets) {
        if (set.userId !== workout.userId || set.workoutId !== workout.id || set.workoutExerciseId !== exercise.id) {
          throw new Error("Workout set ownership or ancestry does not match its workout exercise.");
        }
        await saveWorkoutSetRow(transaction, set);
      }
    }
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.database.runAsync("DELETE FROM local_workouts WHERE id = ? AND user_id = ?;", id, userId);
  }
}

async function saveWorkoutRow(database: LocalDatabaseTransaction, workout: Workout) {
  const row = workoutToRow(workout, await metadataForUpsert(database, "local_workouts", "user_id", workout.userId, workout.id));
  await upsert(database, "local_workouts", workoutColumns, row, [
    "source_template_id", "name", "status", "started_at", "completed_at", "notes",
    "sync_status", "updated_at",
  ]);
}

async function saveWorkoutExerciseRow(database: LocalDatabaseTransaction, exercise: WorkoutExercise) {
  const row = workoutExerciseToRow(exercise, await metadataForUpsert(database, "local_workout_exercises", "user_id", exercise.userId, exercise.id));
  await upsert(database, "local_workout_exercises", exerciseColumns, row, [
    "workout_id", "exercise_id", "position", "target_sets", "target_min_reps",
    "target_max_reps", "target_weight_kg", "source_recommendation_id", "notes",
    "sync_status", "updated_at",
  ]);
}

async function saveWorkoutSetRow(database: LocalDatabaseTransaction, set: WorkoutSet) {
  const row = workoutSetToRow(set, await metadataForUpsert(database, "local_sets", "user_id", set.userId, set.id));
  await upsert(database, "local_sets", setColumns, row, [
    "workout_id", "workout_exercise_id", "exercise_id", "position", "set_type",
    "weight_kg", "reps", "rpe", "notes", "completed_at", "sync_status", "deleted_at",
    "updated_at",
  ]);
}

async function upsert(
  database: LocalDatabaseTransaction,
  table: string,
  columns: string[],
  row: object,
  updates: string[],
) {
  const record = row as Record<string, unknown>;
  await database.runAsync(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders(columns.length)})
     ON CONFLICT(id) DO UPDATE SET ${updates.map((column) => `${column}=excluded.${column}`).join(", ")}
     WHERE ${table}.user_id=excluded.user_id;`,
    ...columns.map((column) => record[column] as never),
  );
}
