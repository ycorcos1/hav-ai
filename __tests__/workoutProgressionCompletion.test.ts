import { DatabaseSync } from "node:sqlite";

import {
  configureLocalDatabase,
  SQLiteExerciseHistoryRepository,
  SQLiteLocalExerciseRepository,
  SQLiteLocalProfileCacheRepository,
  SQLiteLocalRecommendationRepository,
  SQLiteLocalWorkoutRepository,
} from "@/db";
import { WebPreviewExerciseHistoryRepository } from "@/db/webPreview/WebPreviewExerciseHistoryRepository";
import { WebPreviewLocalExerciseRepository } from "@/db/webPreview/WebPreviewLocalExerciseRepository";
import { WebPreviewLocalProfileCacheRepository } from "@/db/webPreview/WebPreviewLocalProfileCacheRepository";
import { WebPreviewLocalRecommendationRepository } from "@/db/webPreview/WebPreviewLocalRecommendationRepository";
import { WebPreviewLocalWorkoutRepository } from "@/db/webPreview/WebPreviewLocalWorkoutRepository";
import type { WebPreviewStorage } from "@/db/webPreview/storage";
import { readWorkoutWebPreviewState } from "@/db/webPreview/workoutStorage";
import { FinishWorkoutService } from "@/features/workouts/services/finishWorkout";
import type {
  Exercise,
  ProgressionRecommendation,
  UserProfile,
  Workout,
  WorkoutSet,
} from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const userId = "user-progression";
const exerciseId = "exercise-progression";
const startedAt = "2026-09-17T12:00:00.000Z";
const completedAt = "2026-09-17T13:00:00.000Z";

class MemoryStorage implements WebPreviewStorage {
  private readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe("offline workout progression completion", () => {
  it("atomically completes, supersedes, persists, and queues a native recommendation", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    const exercises = new SQLiteLocalExerciseRepository(database);
    const profiles = new SQLiteLocalProfileCacheRepository(database);
    const recommendations = new SQLiteLocalRecommendationRepository(database);
    const workouts = new SQLiteLocalWorkoutRepository(database);
    await exercises.upsert(exercise());
    await profiles.upsert(profile());
    await workouts.create(activeWorkout());
    await recommendations.upsert(previousRecommendation());

    const result = await new FinishWorkoutService({
      exerciseHistoryRepository: new SQLiteExerciseHistoryRepository(database),
      exerciseRepository: exercises,
      profileCacheRepository: profiles,
      workoutRepository: workouts,
    }).finish(userId, { workoutId: "workout-current", completedAt });

    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0]).toMatchObject({
      userId,
      exerciseId,
      sourceWorkoutId: "workout-current",
      sourceWorkoutExerciseId: "workout-exercise-current",
      recommendationType: "increase_reps",
      targetSetReps: [9, 9],
      status: "active",
      engineVersion: "progression-v1",
    });
    expect(result.summary.exerciseSummaries[0].nextRecommendation).toEqual(
      result.recommendations[0],
    );
    await expect(recommendations.getActiveForExercise(userId, exerciseId)).resolves.toEqual(
      result.recommendations[0],
    );
    await expect(recommendations.getById(userId, "recommendation-old")).resolves.toMatchObject({
      status: "superseded",
    });
    await expect(database.getAllAsync<{ entity_id: string }>(
      `SELECT entity_id FROM sync_queue
       WHERE entity_type='progression_recommendation' ORDER BY entity_id;`,
    )).resolves.toEqual(
      ["recommendation-old", result.recommendations[0].id]
        .sort()
        .map((entity_id) => ({ entity_id })),
    );
    database.close();
  });

  it("rolls back workout and recommendation state when recommendation queueing fails", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    const exercises = new SQLiteLocalExerciseRepository(database);
    const profiles = new SQLiteLocalProfileCacheRepository(database);
    const recommendations = new SQLiteLocalRecommendationRepository(database);
    const workouts = new SQLiteLocalWorkoutRepository(database);
    await exercises.upsert(exercise());
    await profiles.upsert(profile());
    await workouts.create(activeWorkout());
    await recommendations.upsert(previousRecommendation());
    await database.execAsync(`
      CREATE TRIGGER fail_recommendation_queue
      BEFORE INSERT ON sync_queue
      WHEN NEW.entity_type='progression_recommendation'
      BEGIN SELECT RAISE(ABORT, 'queue failed'); END;
    `);

    await expect(new FinishWorkoutService({
      exerciseHistoryRepository: new SQLiteExerciseHistoryRepository(database),
      exerciseRepository: exercises,
      profileCacheRepository: profiles,
      workoutRepository: workouts,
    }).finish(userId, { workoutId: "workout-current", completedAt })).rejects.toThrow(
      "The workout could not be finished.",
    );
    await expect(workouts.getById(userId, "workout-current")).resolves.toMatchObject({
      status: "active",
    });
    await expect(recommendations.getById(userId, "recommendation-old")).resolves.toMatchObject({
      status: "active",
    });
    database.close();
  });

  it("preserves equivalent atomic recommendation state in the web preview", async () => {
    const storage = new MemoryStorage();
    const exercises = new WebPreviewLocalExerciseRepository(storage);
    const profiles = new WebPreviewLocalProfileCacheRepository(storage);
    const recommendations = new WebPreviewLocalRecommendationRepository(storage);
    const workouts = new WebPreviewLocalWorkoutRepository(storage);
    await exercises.upsert(exercise());
    await profiles.upsert(profile());
    await workouts.create(activeWorkout());
    await recommendations.upsert(previousRecommendation());

    const result = await new FinishWorkoutService({
      exerciseHistoryRepository: new WebPreviewExerciseHistoryRepository(storage),
      exerciseRepository: exercises,
      profileCacheRepository: profiles,
      workoutRepository: workouts,
    }).finish(userId, { workoutId: "workout-current", completedAt });
    const state = readWorkoutWebPreviewState(storage);
    expect(state.recommendations.filter(({ status }) => status === "active")).toEqual(
      result.recommendations,
    );
    expect(state.recommendations.find(({ id }) => id === "recommendation-old")).toMatchObject({
      status: "superseded",
    });
    expect(state.queue).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityType: "progression_recommendation",
        entityId: result.recommendations[0].id,
      }),
      expect.objectContaining({
        entityType: "progression_recommendation",
        entityId: "recommendation-old",
      }),
    ]));
  });

  it("produces the same deterministic recommendation when user-authored note text changes", async () => {
    async function finishWithNotes(noteSuffix: string) {
      const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
      await configureLocalDatabase(database);
      const exercises = new SQLiteLocalExerciseRepository(database);
      const profiles = new SQLiteLocalProfileCacheRepository(database);
      const workouts = new SQLiteLocalWorkoutRepository(database);
      await exercises.upsert(exercise());
      await profiles.upsert(profile());
      await workouts.create(activeWorkout({
        workoutNotes: `Workout ${noteSuffix}`,
        exerciseNotes: `Exercise ${noteSuffix}`,
        setNotes: `Set ${noteSuffix}`,
      }));

      const result = await new FinishWorkoutService({
        exerciseHistoryRepository: new SQLiteExerciseHistoryRepository(database),
        exerciseRepository: exercises,
        profileCacheRepository: profiles,
        workoutRepository: workouts,
      }).finish(userId, { workoutId: "workout-current", completedAt });
      database.close();
      return result.recommendations[0];
    }

    const first = await finishWithNotes("notes one");
    const second = await finishWithNotes("completely different notes");

    expect({
      recommendationType: second.recommendationType,
      recommendedWeightKg: second.recommendedWeightKg,
      targetSets: second.targetSets,
      targetMinReps: second.targetMinReps,
      targetMaxReps: second.targetMaxReps,
      targetSetReps: second.targetSetReps,
      confidence: second.confidence,
      reasonCodes: second.reasonCodes,
      engineVersion: second.engineVersion,
    }).toEqual({
      recommendationType: first.recommendationType,
      recommendedWeightKg: first.recommendedWeightKg,
      targetSets: first.targetSets,
      targetMinReps: first.targetMinReps,
      targetMaxReps: first.targetMaxReps,
      targetSetReps: first.targetSetReps,
      confidence: first.confidence,
      reasonCodes: first.reasonCodes,
      engineVersion: first.engineVersion,
    });
  });
});

function exercise(): Exercise {
  return {
    id: exerciseId,
    ownerUserId: userId,
    name: "Bench Press",
    primaryMuscleGroup: "chest",
    secondaryMuscleGroups: ["triceps"],
    equipmentType: "barbell",
    measurementType: "weight_reps",
    isSystem: false,
    isArchived: false,
    createdAt: startedAt,
    updatedAt: startedAt,
  };
}

function profile(): UserProfile {
  return {
    userId,
    weightUnit: "lb",
    primaryGoal: "hybrid",
    rpePreference: "optional",
    progressionStyle: "balanced",
    defaultRestDurationSeconds: 120,
    onboardingCompleted: true,
    createdAt: startedAt,
    updatedAt: startedAt,
  };
}

function activeWorkout(notes?: {
  workoutNotes: string;
  exerciseNotes: string;
  setNotes: string;
}): Workout {
  return {
    id: "workout-current",
    userId,
    name: "Push",
    status: "active",
    startedAt,
    ...(notes ? { notes: notes.workoutNotes } : {}),
    exercises: [{
      id: "workout-exercise-current",
      userId,
      workoutId: "workout-current",
      exerciseId,
      position: 0,
      targetSets: 2,
      targetMinReps: 6,
      targetMaxReps: 10,
      targetWeightKg: 80,
      ...(notes ? { notes: notes.exerciseNotes } : {}),
      sets: [set("set-1", 9, 0, notes?.setNotes), set("set-2", 8, 1, notes?.setNotes)],
      createdAt: startedAt,
      updatedAt: startedAt,
    }],
    createdAt: startedAt,
    updatedAt: startedAt,
  };
}

function set(id: string, reps: number, position: number, notes?: string): WorkoutSet {
  return {
    id,
    userId,
    workoutId: "workout-current",
    workoutExerciseId: "workout-exercise-current",
    exerciseId,
    position,
    setType: "working",
    weightKg: 80,
    reps,
    ...(notes ? { notes } : {}),
    completedAt,
    createdAt: completedAt,
    updatedAt: completedAt,
  };
}

function previousRecommendation(): ProgressionRecommendation {
  return {
    id: "recommendation-old",
    userId,
    exerciseId,
    recommendationType: "repeat_target",
    recommendedWeightKg: 80,
    targetSets: 2,
    targetMinReps: 6,
    targetMaxReps: 10,
    confidence: "low",
    reasonCodes: ["PERFORMANCE_REPEATED"],
    status: "active",
    engineVersion: "progression-v1",
    createdAt: startedAt,
    updatedAt: startedAt,
  };
}
