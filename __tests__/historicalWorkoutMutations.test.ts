import { DatabaseSync } from "node:sqlite";

import {
  configureLocalDatabase,
  SQLiteExerciseHistoryRepository,
  SQLiteLocalExerciseRepository,
  SQLiteLocalProfileCacheRepository,
  SQLiteLocalRecommendationRepository,
  SQLiteLocalWorkoutRepository,
} from "@/db";
import { WebPreviewLocalWorkoutRepository } from "@/db/webPreview/WebPreviewLocalWorkoutRepository";
import type { WebPreviewStorage } from "@/db/webPreview/storage";
import { readWorkoutWebPreviewState } from "@/db/webPreview/workoutStorage";
import { HistoricalWorkoutMutationService } from "@/features/workouts/services/historicalWorkoutMutations";
import { SQLiteHistoricalWorkoutPersistence } from "@/features/workouts/services/historicalWorkoutPersistence.native";
import { WebPreviewHistoricalWorkoutPersistence } from "@/features/workouts/services/historicalWorkoutPersistence.web";
import { SQLiteSetPersistence } from "@/features/workouts/services/setPersistence.native";
import type { Exercise, UserProfile, Workout } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const userId = "user-a";
const exerciseId = "exercise-1";
const time = "2026-09-10T10:00:00.000Z";

class MemoryStorage implements WebPreviewStorage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function completedWorkout(
  id: string,
  completedAt: string,
  exercise = exerciseId,
  weightKg = 80,
): Workout {
  return {
    id,
    userId,
    name: id,
    status: "completed",
    startedAt: "2026-09-10T09:00:00.000Z",
    completedAt,
    exercises: [{
      id: `${id}-exercise`,
      userId,
      workoutId: id,
      exerciseId: exercise,
      position: 0,
      targetSets: 1,
      targetMinReps: 6,
      targetMaxReps: 10,
      targetWeightKg: weightKg,
      sets: [{
        id: `${id}-set`,
        userId,
        workoutId: id,
        workoutExerciseId: `${id}-exercise`,
        exerciseId: exercise,
        position: 0,
        setType: "working",
        weightKg,
        reps: 8,
        rpe: 8,
        completedAt,
        createdAt: completedAt,
        updatedAt: completedAt,
      }],
      createdAt: completedAt,
      updatedAt: completedAt,
    }],
    createdAt: completedAt,
    updatedAt: completedAt,
  };
}

const exercise: Exercise = {
  id: exerciseId,
  name: "Bench Press",
  primaryMuscleGroup: "chest",
  secondaryMuscleGroups: ["triceps"],
  equipmentType: "barbell",
  measurementType: "weight_reps",
  isSystem: true,
  isArchived: false,
  createdAt: time,
  updatedAt: time,
};

const profile: UserProfile = {
  userId,
  weightUnit: "kg",
  primaryGoal: "strength",
  rpePreference: "optional",
  progressionStyle: "balanced",
  defaultRestDurationSeconds: 120,
  onboardingCompleted: true,
  createdAt: time,
  updatedAt: time,
};

describe("historical workout mutations", () => {
  it("edits a completed set locally, queues it, and recalculates only its derived state", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    const workouts = new SQLiteLocalWorkoutRepository(database);
    const exercises = new SQLiteLocalExerciseRepository(database);
    const profiles = new SQLiteLocalProfileCacheRepository(database);
    const recommendations = new SQLiteLocalRecommendationRepository(database);
    await exercises.upsert(exercise);
    await profiles.upsert(profile);
    await workouts.create(completedWorkout("workout-1", "2026-09-10T10:00:00.000Z"));

    const service = new HistoricalWorkoutMutationService({
      exerciseHistoryRepository: new SQLiteExerciseHistoryRepository(database),
      exerciseRepository: exercises,
      historicalWorkoutPersistence: new SQLiteHistoricalWorkoutPersistence(database),
      profileCacheRepository: profiles,
      recommendationRepository: recommendations,
      setPersistence: new SQLiteSetPersistence(database),
      workoutHistoryRepository: workouts,
    }, () => "2026-09-11T10:00:00.000Z");
    const result = await service.editSet(userId, {
      setId: "workout-1-set",
      weightKg: 90,
      reps: 9,
      rpe: 9,
      notes: "Historical correction",
    });

    expect(result.set).toMatchObject({
      id: "workout-1-set",
      weightKg: 90,
      reps: 9,
      rpe: 9,
      notes: "Historical correction",
    });
    expect(result.personalRecordState.persistedState.map(({ type }) => type).sort()).toEqual([
      "estimated_1rm",
      "max_weight",
    ]);
    expect(result.recommendation).toMatchObject({
      exerciseId,
      sourceWorkoutId: "workout-1",
      sourceWorkoutExerciseId: "workout-1-exercise",
    });
    await expect(database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM sync_queue WHERE entity_type='set' AND entity_id='workout-1-set' AND operation='upsert';",
    )).resolves.toEqual({ count: 1 });
    expect(await recommendations.getActiveForExercise(userId, exerciseId)).toMatchObject({
      sourceWorkoutId: "workout-1",
    });
    database.close();
  });

  it("deletes a cloud-known workout, queues its delete, and recalculates affected exercise only", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    const workouts = new SQLiteLocalWorkoutRepository(database);
    const exercises = new SQLiteLocalExerciseRepository(database);
    const profiles = new SQLiteLocalProfileCacheRepository(database);
    const recommendations = new SQLiteLocalRecommendationRepository(database);
    await exercises.upsert(exercise);
    await exercises.upsert({ ...exercise, id: "exercise-2", name: "Row" });
    await profiles.upsert(profile);
    await workouts.create(completedWorkout("older", "2026-09-08T10:00:00.000Z", exerciseId, 75));
    await workouts.create(completedWorkout("newest", "2026-09-10T10:00:00.000Z", exerciseId, 80));
    await workouts.create(completedWorkout("unrelated", "2026-09-09T10:00:00.000Z", "exercise-2", 60));
    await database.runAsync(
      "UPDATE local_workouts SET sync_status='synced', server_updated_at=? WHERE id='newest';",
      time,
    );
    await database.runAsync(
      `INSERT INTO cached_recent_exercise_sessions (
        id, user_id, exercise_id, workout_id, completed_at, working_sets_json
      ) VALUES (?, ?, ?, ?, ?, ?);`,
      "cached-newest",
      userId,
      exerciseId,
      "newest",
      "2026-09-10T10:00:00.000Z",
      JSON.stringify([{ weightKg: 80, reps: 8, rpe: 8 }]),
    );

    const service = new HistoricalWorkoutMutationService({
      exerciseHistoryRepository: new SQLiteExerciseHistoryRepository(database),
      exerciseRepository: exercises,
      historicalWorkoutPersistence: new SQLiteHistoricalWorkoutPersistence(database),
      profileCacheRepository: profiles,
      recommendationRepository: recommendations,
      setPersistence: new SQLiteSetPersistence(database),
      workoutHistoryRepository: workouts,
    }, () => "2026-09-11T10:00:00.000Z");
    const result = await service.deleteWorkout(userId, "newest");

    expect(result.affectedExerciseIds).toEqual([exerciseId]);
    expect(await workouts.getById(userId, "newest")).toBeNull();
    expect(await workouts.getById(userId, "unrelated")).not.toBeNull();
    expect(await recommendations.getActiveForExercise(userId, exerciseId)).toMatchObject({
      sourceWorkoutId: "older",
    });
    expect(await recommendations.getActiveForExercise(userId, "exercise-2")).toBeNull();
    await expect(database.getAllAsync(
      "SELECT entity_type, entity_id, operation FROM sync_queue WHERE entity_id IN ('newest', 'newest-exercise', 'newest-set') ORDER BY entity_type;",
    )).resolves.toEqual([{ entity_type: "workout", entity_id: "newest", operation: "delete" }]);
    await expect(database.getFirstAsync(
      "SELECT id FROM cached_recent_exercise_sessions WHERE workout_id='newest';",
    )).resolves.toBeNull();
    database.close();
  });

  it("does not queue a remote delete for a never-synced web-preview workout", async () => {
    const storage = new MemoryStorage();
    const workouts = new WebPreviewLocalWorkoutRepository(storage);
    await workouts.create(completedWorkout("local", time));
    const result = await new WebPreviewHistoricalWorkoutPersistence(storage)
      .deleteCompletedWorkout(userId, "local", "2026-09-11T10:00:00.000Z");

    expect(result.status).toBe("deleted-local");
    expect(readWorkoutWebPreviewState(storage).workouts).toEqual([]);
    expect(readWorkoutWebPreviewState(storage).queue).toEqual([]);
  });
});
