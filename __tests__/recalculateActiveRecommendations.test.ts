import { DatabaseSync } from "node:sqlite";

import {
  configureLocalDatabase,
  SQLiteExerciseHistoryRepository,
  SQLiteLocalExerciseRepository,
  SQLiteLocalProfileCacheRepository,
  SQLiteLocalRecommendationRepository,
  SQLiteLocalWorkoutRepository,
} from "@/db";
import { recalculateActiveRecommendations } from "@/features/recommendations/services";
import type { Exercise, ProgressionRecommendation, UserProfile, Workout } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const userId = "user-a";
const exerciseId = "exercise-1";
const completedAt = "2026-09-20T12:00:00.000Z";
const recalculatedAt = "2026-09-21T12:00:00.000Z";

describe("active recommendation recalculation", () => {
  it("replaces active derived state from the latest raw workout without rewriting history", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    const workouts = new SQLiteLocalWorkoutRepository(database);
    const exercises = new SQLiteLocalExerciseRepository(database);
    const profiles = new SQLiteLocalProfileCacheRepository(database);
    const recommendations = new SQLiteLocalRecommendationRepository(database);
    const workout = completedWorkout();
    await exercises.upsert(exercise());
    await profiles.upsert(profile());
    await workouts.create(workout);
    await recommendations.upsert(previousRecommendation());

    await recalculateActiveRecommendations({
      exerciseHistoryRepository: new SQLiteExerciseHistoryRepository(database),
      exerciseRepository: exercises,
      profileCacheRepository: profiles,
      recommendationRepository: recommendations,
      workoutHistoryRepository: workouts,
    }, userId, recalculatedAt);

    const active = await recommendations.getActiveForExercise(userId, exerciseId);
    expect(active).toMatchObject({
      createdAt: recalculatedAt,
      exerciseId,
      sourceWorkoutExerciseId: "workout-1-exercise",
      sourceWorkoutId: "workout-1",
      status: "active",
      updatedAt: recalculatedAt,
    });
    expect(active?.id).not.toBe("recommendation-old");
    expect(await recommendations.getById(userId, "recommendation-old")).toMatchObject({
      status: "superseded",
    });
    expect(await workouts.getById(userId, workout.id)).toEqual(workout);
    database.close();
  });
});

function exercise(): Exercise {
  return {
    id: exerciseId,
    name: "Bench Press",
    primaryMuscleGroup: "chest",
    secondaryMuscleGroups: ["triceps"],
    equipmentType: "barbell",
    measurementType: "weight_reps",
    isSystem: true,
    isArchived: false,
    createdAt: completedAt,
    updatedAt: completedAt,
  };
}

function profile(): UserProfile {
  return {
    userId,
    weightUnit: "kg",
    primaryGoal: "strength",
    rpePreference: "optional",
    progressionStyle: "aggressive",
    defaultRestDurationSeconds: 120,
    onboardingCompleted: true,
    createdAt: completedAt,
    updatedAt: recalculatedAt,
  };
}

function completedWorkout(): Workout {
  return {
    id: "workout-1",
    userId,
    name: "Upper",
    status: "completed",
    startedAt: "2026-09-20T11:00:00.000Z",
    completedAt,
    exercises: [{
      id: "workout-1-exercise",
      userId,
      workoutId: "workout-1",
      exerciseId,
      position: 0,
      targetSets: 1,
      targetMinReps: 6,
      targetMaxReps: 8,
      targetWeightKg: 80,
      sets: [{
        id: "workout-1-set",
        userId,
        workoutId: "workout-1",
        workoutExerciseId: "workout-1-exercise",
        exerciseId,
        position: 0,
        setType: "working",
        weightKg: 80,
        reps: 8,
        rpe: 7,
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

function previousRecommendation(): ProgressionRecommendation {
  return {
    id: "recommendation-old",
    userId,
    exerciseId,
    sourceWorkoutId: "workout-1",
    sourceWorkoutExerciseId: "workout-1-exercise",
    recommendationType: "repeat_target",
    recommendedWeightKg: 80,
    targetSets: 1,
    targetMinReps: 6,
    targetMaxReps: 8,
    confidence: "medium",
    reasonCodes: ["WITHIN_TARGET_RANGE"],
    status: "active",
    engineVersion: "1.0.0",
    createdAt: completedAt,
    updatedAt: completedAt,
  };
}
