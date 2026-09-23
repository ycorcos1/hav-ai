import { fireEvent, render } from "@testing-library/react-native";

jest.mock("@/lib/supabase/client", () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

import type { CoachApi } from "@/features/ai/api";
import { ActiveWorkoutCoachScreen } from "@/features/coach/screens/ActiveWorkoutCoachScreen";
import { buildActiveWorkoutCoachContext } from "@/features/coach/services/activeWorkoutCoachContext";
import type { ActiveWorkoutExercise } from "@/features/workouts/services/workoutApplication";

const time = "2026-09-21T12:00:00.000Z";
const activeExercise: ActiveWorkoutExercise = {
  exercise: {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Bench Press",
    primaryMuscleGroup: "chest",
    secondaryMuscleGroups: [],
    equipmentType: "barbell",
    measurementType: "weight_reps",
    isSystem: true,
    isArchived: false,
    createdAt: time,
    updatedAt: time,
  },
  exercisePreference: { id: "55555555-5555-4555-8555-555555555555", userId: "user-a", exerciseId: "11111111-1111-4111-8111-111111111111", isFavorite: false, notes: "Keep shoulders pinned", createdAt: time, updatedAt: time },
  profile: { userId: "user-a", weightUnit: "kg", primaryGoal: "strength", rpePreference: "optional", progressionStyle: "balanced", defaultRestDurationSeconds: 120, onboardingCompleted: true, createdAt: time, updatedAt: time },
  previousPerformance: null,
  workout: {
    id: "22222222-2222-4222-8222-222222222222",
    userId: "user-a",
    name: "Push",
    notes: "Low sleep",
    status: "active",
    startedAt: time,
    exercises: [],
    createdAt: time,
    updatedAt: time,
  },
  workoutExercise: {
    id: "33333333-3333-4333-8333-333333333333",
    userId: "user-a",
    workoutId: "22222222-2222-4222-8222-222222222222",
    exerciseId: "11111111-1111-4111-8111-111111111111",
    position: 0,
    targetSets: 3,
    targetMinReps: 6,
    targetMaxReps: 8,
    targetWeightKg: 82.5,
    sets: [{ id: "44444444-4444-4444-8444-444444444444", userId: "user-a", workoutId: "22222222-2222-4222-8222-222222222222", workoutExerciseId: "33333333-3333-4333-8333-333333333333", exerciseId: "11111111-1111-4111-8111-111111111111", position: 0, setType: "working", weightKg: 82.5, reps: 7, rpe: 9, notes: "Slow final rep", completedAt: time, createdAt: time, updatedAt: time }],
    createdAt: time,
    updatedAt: time,
  },
};

describe("active workout Coach entry", () => {
  it("builds bounded current-session facts from the latest local exercise snapshot", () => {
    expect(buildActiveWorkoutCoachContext(activeExercise)).toEqual({
      activeWorkoutId: activeExercise.workout.id,
      activeExerciseId: activeExercise.exercise!.id,
      localCurrentSession: {
        workoutId: activeExercise.workout.id,
        exerciseId: activeExercise.exercise!.id,
        currentTarget: { weightKg: 82.5, minReps: 6, maxReps: 8, targetSets: 3 },
        completedSets: [{ weightKg: 82.5, reps: 7, rpe: 9, notes: "Slow final rep" }],
        workoutNotes: "Low sleep",
        exercisePreferenceNotes: "Keep shoulders pinned",
      },
    });
  });

  it("opens a focused Coach view and submits the local context", async () => {
    const ask = jest.fn<ReturnType<CoachApi["ask"]>, Parameters<CoachApi["ask"]>>()
      .mockResolvedValue({
        answer: "Keep the same load for set two.",
        warnings: [],
        contextUsed: { activeWorkout: true, exerciseId: activeExercise.exercise!.id, recentSessionsUsed: 2, subjectiveNotesUsed: { exercisePreference: true, workout: true, setCount: 1 } },
        meta: { promptVersion: "coach-v1" },
      });
    const onClose = jest.fn();
    const screen = await render(
      <ActiveWorkoutCoachScreen
        api={{ ask }}
        loadExercise={async () => activeExercise}
        onClose={onClose}
      />,
    );

    expect(await screen.findByText("Bench Press · Current Workout")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Ask havAI"), "What should I do next?");
    await fireEvent.press(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("Keep the same load for set two.")).toBeOnTheScreen();
    expect(ask).toHaveBeenCalledWith(expect.objectContaining({
      message: "What should I do next?",
      context: buildActiveWorkoutCoachContext(activeExercise),
    }));
    await fireEvent.press(screen.getByRole("button", { name: "Go back" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
