import { render, screen } from "@testing-library/react-native";

import { WorkoutHistoryDetailScreen } from "@/features/workouts/screens/WorkoutHistoryDetailScreen";
import type { WorkoutHistoryDetail } from "@/features/workouts/services/workoutApplication";

const detail: WorkoutHistoryDetail = {
  weightUnit: "kg",
  workout: {
    id: "workout-1",
    userId: "user-a",
    name: "Push Day",
    status: "completed",
    startedAt: "2026-09-03T10:00:00.000Z",
    completedAt: "2026-09-03T11:00:00.000Z",
    notes: "Strong session",
    exercises: [],
    createdAt: "2026-09-03T10:00:00.000Z",
    updatedAt: "2026-09-03T11:00:00.000Z",
  },
  exercises: [{
    exercise: {
      id: "exercise-1",
      name: "Bench Press",
      primaryMuscleGroup: "chest",
      secondaryMuscleGroups: ["triceps"],
      equipmentType: "barbell",
      measurementType: "weight_reps",
      isSystem: true,
      isArchived: false,
      createdAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-01T10:00:00.000Z",
    },
    workoutExercise: {
      id: "workout-exercise-1",
      userId: "user-a",
      workoutId: "workout-1",
      exerciseId: "exercise-1",
      position: 0,
      sets: [{
        id: "warmup",
        userId: "user-a",
        workoutId: "workout-1",
        workoutExerciseId: "workout-exercise-1",
        exerciseId: "exercise-1",
        position: 0,
        setType: "warmup",
        weightKg: 40,
        reps: 10,
        notes: "Easy warm-up",
        completedAt: "2026-09-03T10:05:00.000Z",
        createdAt: "2026-09-03T10:05:00.000Z",
        updatedAt: "2026-09-03T10:05:00.000Z",
      }, {
        id: "working",
        userId: "user-a",
        workoutId: "workout-1",
        workoutExerciseId: "workout-exercise-1",
        exerciseId: "exercise-1",
        position: 1,
        setType: "working",
        weightKg: 80,
        reps: 8,
        rpe: 8,
        completedAt: "2026-09-03T10:10:00.000Z",
        createdAt: "2026-09-03T10:10:00.000Z",
        updatedAt: "2026-09-03T10:10:00.000Z",
      }],
      createdAt: "2026-09-03T10:00:00.000Z",
      updatedAt: "2026-09-03T11:00:00.000Z",
    },
  }],
};

describe("WorkoutHistoryDetailScreen", () => {
  it("shows exercises, set types, values, RPE, and present notes", async () => {
    await render(<WorkoutHistoryDetailScreen loadWorkout={async () => detail} />);
    expect(await screen.findByText("Push Day")).toBeOnTheScreen();
    expect(screen.getByText("Strong session")).toBeOnTheScreen();
    expect(screen.getByText("Bench Press")).toBeOnTheScreen();
    expect(screen.getByText("Warm-up 1 · 40 kg × 10")).toBeOnTheScreen();
    expect(screen.getByText("Working 2 · 80 kg × 8 · RPE 8")).toBeOnTheScreen();
    expect(screen.getByText("Easy warm-up")).toBeOnTheScreen();
  });
});
