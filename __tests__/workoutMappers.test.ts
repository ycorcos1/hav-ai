import type { Workout, WorkoutExercise, WorkoutSet } from "@/shared/contracts";
import {
  workoutExerciseFromRow,
  workoutExerciseToRow,
  workoutFromRow,
  workoutSetFromRow,
  workoutSetToRow,
  workoutToRow,
} from "@/db/mappers";

const createdAt = "2026-08-29T12:00:00.000Z";
const updatedAt = "2026-08-29T13:00:00.000Z";
const completedAt = "2026-08-29T12:45:00.000Z";
const metadata = { syncStatus: "pending_update" as const, serverUpdatedAt: updatedAt };

const set: WorkoutSet = {
  id: "set-1",
  userId: "user-1",
  workoutId: "workout-1",
  workoutExerciseId: "workout-exercise-1",
  exerciseId: "exercise-1",
  position: 2,
  setType: "working",
  weightKg: 82.5538,
  reps: 8,
  rpe: 8.5,
  notes: "Controlled eccentric",
  completedAt,
  createdAt,
  updatedAt,
};

const workoutExercise: WorkoutExercise = {
  id: "workout-exercise-1",
  userId: "user-1",
  workoutId: "workout-1",
  exerciseId: "exercise-1",
  position: 1,
  targetSets: 3,
  targetMinReps: 6,
  targetMaxReps: 8,
  targetWeightKg: 82.5538,
  sourceRecommendationId: "recommendation-1",
  notes: "Pause on chest",
  sets: [set],
  createdAt,
  updatedAt,
};

const workout: Workout = {
  id: "workout-1",
  userId: "user-1",
  sourceTemplateId: "template-1",
  name: "Upper A",
  status: "completed",
  startedAt: createdAt,
  completedAt,
  notes: "Strong session",
  exercises: [workoutExercise],
  createdAt,
  updatedAt,
};

describe("workout persistence mappers", () => {
  it("maps workout sets in both directions without losing kg, RPE, notes, or position", () => {
    const row = workoutSetToRow(set, { ...metadata, deletedAt: completedAt });

    expect(row).toMatchObject({
      position: 2,
      weight_kg: 82.5538,
      reps: 8,
      rpe: 8.5,
      notes: "Controlled eccentric",
      completed_at: completedAt,
      deleted_at: completedAt,
    });
    expect(workoutSetFromRow(row)).toEqual(set);

    expect(
      workoutSetFromRow({ ...row, weight_kg: null, rpe: null, notes: null }),
    ).toMatchObject({ weightKg: undefined, rpe: undefined, notes: undefined });
  });

  it("maps workout exercises in both directions while preserving IDs, targets, notes, and order", () => {
    const row = workoutExerciseToRow(workoutExercise, metadata);

    expect(row).toMatchObject({
      workout_id: "workout-1",
      exercise_id: "exercise-1",
      position: 1,
      target_weight_kg: 82.5538,
      source_recommendation_id: "recommendation-1",
      notes: "Pause on chest",
    });
    expect(workoutExerciseFromRow(row, [set])).toEqual(workoutExercise);
  });

  it("maps workouts in both directions and handles nullable completion and notes", () => {
    const row = workoutToRow(workout, metadata);

    expect(row).toMatchObject({
      source_template_id: "template-1",
      completed_at: completedAt,
      notes: "Strong session",
      sync_status: "pending_update",
    });
    expect(workoutFromRow(row, [workoutExercise])).toEqual(workout);
    expect(
      workoutFromRow(
        { ...row, source_template_id: null, completed_at: null, notes: null },
        [],
      ),
    ).toMatchObject({
      sourceTemplateId: undefined,
      completedAt: undefined,
      notes: undefined,
      exercises: [],
    });
  });
});
