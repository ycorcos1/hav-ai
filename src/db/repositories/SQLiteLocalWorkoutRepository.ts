import type {
  ProgressionRecommendation,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from "@/shared/contracts";

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
import { upsertRecommendationInTransaction } from "./SQLiteLocalRecommendationRepository";
import { enqueueSyncUpsert } from "./syncQueueUtils";
import type {
  LocalWorkoutRepository,
  WorkoutHistoryPage,
  WorkoutHistoryRepository,
} from "./types";

const workoutColumns = ["id", "user_id", "source_template_id", "name", "status", "started_at", "completed_at", "notes", "sync_status", "created_at", "updated_at", "server_updated_at"];
const exerciseColumns = ["id", "user_id", "workout_id", "exercise_id", "position", "target_sets", "target_min_reps", "target_max_reps", "target_weight_kg", "source_recommendation_id", "notes", "sync_status", "created_at", "updated_at", "server_updated_at"];
const setColumns = ["id", "user_id", "workout_id", "workout_exercise_id", "exercise_id", "position", "set_type", "weight_kg", "reps", "rpe", "notes", "completed_at", "sync_status", "deleted_at", "created_at", "updated_at", "server_updated_at"];

export class SQLiteLocalWorkoutRepository implements LocalWorkoutRepository, WorkoutHistoryRepository {
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

  async listCompleted(params: {
    userId: string;
    limit: number;
    cursor?: { completedAt: string; id: string };
  }): Promise<WorkoutHistoryPage> {
    const limit = Math.max(1, Math.floor(params.limit));
    const cursorClause = params.cursor
      ? "AND (completed_at < ? OR (completed_at = ? AND id < ?))"
      : "";
    const cursorValues = params.cursor
      ? [params.cursor.completedAt, params.cursor.completedAt, params.cursor.id]
      : [];
    const rows = await this.database.getAllAsync<LocalWorkoutRow>(
      `SELECT * FROM local_workouts
       WHERE user_id = ? AND status = 'completed' AND completed_at IS NOT NULL
       ${cursorClause}
       ORDER BY completed_at DESC, id DESC
       LIMIT ?;`,
      params.userId,
      ...cursorValues,
      limit + 1,
    );
    const pageRows = rows.slice(0, limit);
    const items = await Promise.all(pageRows.map((row) => this.hydrate(row, params.userId)));
    const last = pageRows.at(-1);
    return {
      items,
      nextCursor: rows.length > limit && last?.completed_at
        ? { completedAt: last.completed_at, id: last.id }
        : undefined,
    };
  }

  async getLatestCompletedForExercise(userId: string, exerciseId: string): Promise<Workout | null> {
    const row = await this.database.getFirstAsync<LocalWorkoutRow>(
      `SELECT w.* FROM local_workouts w
       JOIN local_workout_exercises we ON we.workout_id=w.id AND we.user_id=w.user_id
       WHERE w.user_id=? AND w.status='completed' AND w.completed_at IS NOT NULL
         AND we.exercise_id=?
       ORDER BY w.completed_at DESC, w.id DESC
       LIMIT 1;`,
      userId,
      exerciseId,
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
      await enqueueSyncUpsert(
        transaction, workout.userId, "workout", workout.id, workout.createdAt,
      );
      for (const exercise of workout.exercises) {
        await enqueueSyncUpsert(
          transaction, exercise.userId, "workout_exercise", exercise.id, exercise.createdAt,
        );
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
          workout.userId,
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
      await enqueueSyncUpsert(
        transaction, workout.userId, "workout", workout.id, workout.updatedAt,
      );
      for (const exercise of workout.exercises) {
        await enqueueSyncUpsert(
          transaction, exercise.userId, "workout_exercise", exercise.id, workout.updatedAt,
        );
      }
    });
  }

  async finish(
    workout: Workout,
    recommendations: readonly ProgressionRecommendation[] = [],
  ): Promise<void> {
    if (workout.status !== "completed" || workout.completedAt === undefined) {
      throw new Error("Only a completed workout can be finalized.");
    }
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const existing = await transaction.getFirstAsync<{
        status: string;
        user_id: string;
      }>("SELECT user_id, status FROM local_workouts WHERE id=?;", workout.id);
      if (!existing || existing.user_id !== workout.userId || existing.status !== "active") {
        throw new Error("The active workout could not be finalized.");
      }
      await this.saveInTransaction(transaction, workout);
      await enqueueSyncUpsert(
        transaction,
        workout.userId,
        "workout",
        workout.id,
        workout.updatedAt,
      );
      for (const exercise of workout.exercises) {
        await enqueueSyncUpsert(
          transaction,
          exercise.userId,
          "workout_exercise",
          exercise.id,
          workout.updatedAt,
        );
      }
      for (const recommendation of recommendations) {
        if (
          recommendation.userId !== workout.userId ||
          recommendation.sourceWorkoutId !== workout.id ||
          !workout.exercises.some(
            (exercise) =>
              exercise.id === recommendation.sourceWorkoutExerciseId &&
              exercise.exerciseId === recommendation.exerciseId,
          )
        ) {
          throw new Error("Workout recommendation ownership or source does not match completion.");
        }
        await upsertRecommendationInTransaction(transaction, recommendation);
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
