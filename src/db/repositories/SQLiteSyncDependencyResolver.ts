import type {
  SyncDependencyResolver,
  SyncEntityReference,
  SyncQueueItem,
  UUID,
} from "@/shared/contracts";

import type { LocalDatabaseConnection } from "../types";

type ExerciseReferenceRow = {
  exercise_id: UUID;
};

export class SQLiteSyncDependencyResolver implements SyncDependencyResolver {
  constructor(
    private readonly database: LocalDatabaseConnection,
    private readonly userId: UUID,
  ) {}

  async getDependencies(item: SyncQueueItem): Promise<SyncEntityReference[]> {
    if (item.operation === "delete") return [];

    switch (item.entityType) {
      case "custom_exercise":
      case "workout_template":
        return [];
      case "workout_template_exercise":
        return this.templateExerciseDependencies(item.entityId);
      case "workout":
        return this.workoutDependencies(item.entityId);
      case "workout_exercise":
        return this.workoutExerciseDependencies(item.entityId);
      case "set":
        return this.setDependencies(item.entityId);
      case "user_exercise_preference":
        return this.preferenceDependencies(item.entityId);
      case "progression_recommendation":
        return this.recommendationDependencies(item.entityId);
    }
  }

  private async templateExerciseDependencies(id: UUID): Promise<SyncEntityReference[]> {
    const row = await this.database.getFirstAsync<ExerciseReferenceRow & { template_id: UUID }>(
      `SELECT template_id, exercise_id
       FROM local_workout_template_exercises
       WHERE id = ? AND user_id = ?;`,
      id,
      this.userId,
    );
    if (!row) return [];
    return [
      reference("workout_template", row.template_id),
      ...await this.customExerciseDependency(row.exercise_id),
    ];
  }

  private async workoutDependencies(id: UUID): Promise<SyncEntityReference[]> {
    const row = await this.database.getFirstAsync<{ source_template_id: UUID | null }>(
      `SELECT source_template_id
       FROM local_workouts
       WHERE id = ? AND user_id = ?;`,
      id,
      this.userId,
    );
    return row?.source_template_id
      ? [reference("workout_template", row.source_template_id)]
      : [];
  }

  private async workoutExerciseDependencies(id: UUID): Promise<SyncEntityReference[]> {
    const row = await this.database.getFirstAsync<ExerciseReferenceRow & {
      source_recommendation_id: UUID | null;
      workout_id: UUID;
    }>(
      `SELECT workout_id, exercise_id, source_recommendation_id
       FROM local_workout_exercises
       WHERE id = ? AND user_id = ?;`,
      id,
      this.userId,
    );
    if (!row) return [];
    return [
      reference("workout", row.workout_id),
      ...await this.customExerciseDependency(row.exercise_id),
      ...(row.source_recommendation_id
        ? [reference("progression_recommendation", row.source_recommendation_id)]
        : []),
    ];
  }

  private async setDependencies(id: UUID): Promise<SyncEntityReference[]> {
    const row = await this.database.getFirstAsync<ExerciseReferenceRow & {
      workout_exercise_id: UUID;
      workout_id: UUID;
    }>(
      `SELECT workout_id, workout_exercise_id, exercise_id
       FROM local_sets
       WHERE id = ? AND user_id = ?;`,
      id,
      this.userId,
    );
    if (!row) return [];
    return [
      reference("workout", row.workout_id),
      reference("workout_exercise", row.workout_exercise_id),
      ...await this.customExerciseDependency(row.exercise_id),
    ];
  }

  private async preferenceDependencies(id: UUID): Promise<SyncEntityReference[]> {
    const row = await this.database.getFirstAsync<ExerciseReferenceRow>(
      `SELECT exercise_id
       FROM local_user_exercise_preferences
       WHERE id = ? AND user_id = ?;`,
      id,
      this.userId,
    );
    return row ? this.customExerciseDependency(row.exercise_id) : [];
  }

  private async recommendationDependencies(id: UUID): Promise<SyncEntityReference[]> {
    const row = await this.database.getFirstAsync<ExerciseReferenceRow & {
      source_workout_exercise_id: UUID | null;
      source_workout_id: UUID | null;
    }>(
      `SELECT exercise_id, source_workout_id, source_workout_exercise_id
       FROM local_progression_recommendations
       WHERE id = ? AND user_id = ?;`,
      id,
      this.userId,
    );
    if (!row) return [];
    return [
      ...(row.source_workout_id
        ? [reference("workout", row.source_workout_id)]
        : []),
      ...(row.source_workout_exercise_id
        ? [reference("workout_exercise", row.source_workout_exercise_id)]
        : []),
      ...await this.customExerciseDependency(row.exercise_id),
    ];
  }

  private async customExerciseDependency(exerciseId: UUID): Promise<SyncEntityReference[]> {
    const row = await this.database.getFirstAsync<{ id: UUID }>(
      `SELECT id
       FROM local_exercises
       WHERE id = ? AND owner_user_id = ? AND is_system = 0;`,
      exerciseId,
      this.userId,
    );
    return row ? [reference("custom_exercise", row.id)] : [];
  }
}

function reference(
  entityType: SyncEntityReference["entityType"],
  entityId: UUID,
): SyncEntityReference {
  return { entityType, entityId };
}
