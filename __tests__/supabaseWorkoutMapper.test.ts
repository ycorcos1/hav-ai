import {
  workoutExerciseToCloudUpsert,
  workoutSetToCloudUpsert,
  workoutToCloudUpsert,
} from "@/lib/supabase/mappers/workoutMapper";
import type { Workout } from "@/shared/contracts";

const timestamp = "2026-09-15T14:00:00.000Z";
const workout: Workout = {
  id: "fa200000-0000-4000-8000-000000000001",
  userId: "a0000000-0000-4000-8000-00000000000a",
  sourceTemplateId: "fa100000-0000-4000-8000-000000000001",
  name: "Push Day",
  status: "completed",
  startedAt: "2026-09-15T13:00:00.000Z",
  completedAt: timestamp,
  notes: "Strong session",
  createdAt: "2026-09-15T12:59:00.000Z",
  updatedAt: timestamp,
  exercises: [{
    id: "fa210000-0000-4000-8000-000000000001",
    userId: "a0000000-0000-4000-8000-00000000000a",
    workoutId: "fa200000-0000-4000-8000-000000000001",
    exerciseId: "10000000-0000-4000-8000-000000000001",
    position: 0,
    targetSets: 3,
    targetMinReps: 8,
    targetMaxReps: 10,
    targetWeightKg: 82.5,
    sourceRecommendationId: "fa300000-0000-4000-8000-000000000001",
    notes: "Pause each rep",
    createdAt: "2026-09-15T12:59:00.000Z",
    updatedAt: timestamp,
    sets: [{
      id: "fa220000-0000-4000-8000-000000000001",
      userId: "a0000000-0000-4000-8000-00000000000a",
      workoutId: "fa200000-0000-4000-8000-000000000001",
      workoutExerciseId: "fa210000-0000-4000-8000-000000000001",
      exerciseId: "10000000-0000-4000-8000-000000000001",
      position: 0,
      setType: "working",
      weightKg: 80,
      reps: 10,
      rpe: 8,
      notes: "Clean reps",
      completedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    }],
  }],
};

describe("Supabase workout mapper", () => {
  it("maps a workout without local or server-controlled metadata", () => {
    expect(workoutToCloudUpsert(workout)).toEqual({
      id: workout.id,
      user_id: workout.userId,
      source_template_id: workout.sourceTemplateId,
      name: "Push Day",
      status: "completed",
      started_at: workout.startedAt,
      completed_at: workout.completedAt,
      notes: "Strong session",
    });
  });

  it("maps an ordered workout exercise and preserves its recommendation snapshot", () => {
    expect(workoutExerciseToCloudUpsert(workout.exercises[0])).toEqual({
      id: workout.exercises[0].id,
      user_id: workout.userId,
      workout_id: workout.id,
      exercise_id: workout.exercises[0].exerciseId,
      position: 0,
      target_sets: 3,
      target_min_reps: 8,
      target_max_reps: 10,
      target_weight_kg: 82.5,
      source_recommendation_id: workout.exercises[0].sourceRecommendationId,
      notes: "Pause each rep",
    });
  });

  it("maps canonical kilograms, event time, type, order, RPE, and set notes", () => {
    expect(workoutSetToCloudUpsert(workout.exercises[0].sets[0])).toEqual({
      id: workout.exercises[0].sets[0].id,
      user_id: workout.userId,
      workout_id: workout.id,
      workout_exercise_id: workout.exercises[0].id,
      exercise_id: workout.exercises[0].exerciseId,
      position: 0,
      set_type: "working",
      weight_kg: 80,
      reps: 10,
      rpe: 8,
      notes: "Clean reps",
      completed_at: timestamp,
    });
  });
});
