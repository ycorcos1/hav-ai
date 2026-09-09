import { fireEvent, render } from "@testing-library/react-native";

import { ActiveExerciseLoggingScreen } from "@/features/workouts/screens/ActiveExerciseLoggingScreen";
import type { ActiveWorkoutExercise } from "@/features/workouts/services/workoutApplication";

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Medium: "medium" },
  impactAsync: jest.fn().mockResolvedValue(undefined),
}));

const time = "2026-09-09T12:00:00.000Z";

function activeExercise(
  weightUnit: "kg" | "lb",
  previousPerformance: ActiveWorkoutExercise["previousPerformance"],
  targetWeightKg?: number,
): ActiveWorkoutExercise {
  return {
    exercise: {
      id: "exercise-1",
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
    exercisePreference: null,
    profile: {
      userId: "user-a",
      weightUnit,
      primaryGoal: "hybrid",
      rpePreference: "optional",
      progressionStyle: "balanced",
      defaultRestDurationSeconds: 120,
      onboardingCompleted: true,
      createdAt: time,
      updatedAt: time,
    },
    previousPerformance,
    workout: {
      id: "workout-1",
      userId: "user-a",
      name: "Push",
      status: "active",
      startedAt: time,
      exercises: [{
        id: "workout-exercise-1",
        userId: "user-a",
        workoutId: "workout-1",
        exerciseId: "exercise-1",
        position: 0,
        targetSets: 3,
        ...(targetWeightKg === undefined ? {} : { targetWeightKg }),
        sets: [],
        createdAt: time,
        updatedAt: time,
      }],
      createdAt: time,
      updatedAt: time,
    },
    workoutExercise: {
      id: "workout-exercise-1",
      userId: "user-a",
      workoutId: "workout-1",
      exerciseId: "exercise-1",
      position: 0,
      targetSets: 3,
      ...(targetWeightKg === undefined ? {} : { targetWeightKg }),
      sets: [],
      createdAt: time,
      updatedAt: time,
    },
  };
}

describe("previous working-set weight prefill", () => {
  it("uses the latest comparable working-set weight while leaving reps and RPE blank", async () => {
    const completeSet = jest.fn().mockResolvedValue({ set: {} });
    const rendered = await render(
      <ActiveExerciseLoggingScreen
        completeSet={completeSet}
        loadExercise={async () => activeExercise("kg", {
          workoutId: "previous-workout",
          completedAt: time,
          sets: [
            { weightKg: 80, reps: 8, rpe: 8 },
            { weightKg: 82.5, reps: 7, rpe: 9 },
          ],
        }, 90)}
        onOpenExercise={jest.fn()}
        onOverview={jest.fn()}
      />,
    );

    await rendered.findByText("Bench Press");
    expect(rendered.getByLabelText("Weight (kg)")).toHaveProp("value", "82.5");
    expect(rendered.getByLabelText("Reps")).toHaveProp("value", "");
    expect(rendered.getByRole("button", { name: "Select RPE" })).toBeTruthy();
    expect(rendered.getByRole("button", { name: "Complete Set" })).toBeDisabled();
  });

  it("formats pounds for display and converts only the completed value back to kilograms", async () => {
    const completeSet = jest.fn().mockResolvedValue({
      set: {
        id: "set-1",
        userId: "user-a",
        workoutId: "workout-1",
        workoutExerciseId: "workout-exercise-1",
        exerciseId: "exercise-1",
        position: 0,
        setType: "working",
        weightKg: 82.5,
        reps: 8,
        completedAt: time,
        createdAt: time,
        updatedAt: time,
      },
    });
    const rendered = await render(
      <ActiveExerciseLoggingScreen
        completeSet={completeSet}
        loadExercise={async () => activeExercise("lb", {
          workoutId: "previous-workout",
          completedAt: time,
          sets: [{ weightKg: 82.5, reps: 8 }],
        })}
        onOpenExercise={jest.fn()}
        onOverview={jest.fn()}
      />,
    );

    await rendered.findByText("Bench Press");
    expect(rendered.getByLabelText("Weight (lb)")).toHaveProp("value", "181.88");
    await fireEvent.changeText(rendered.getByLabelText("Reps"), "8");
    await fireEvent.press(rendered.getByRole("button", { name: "Complete Set" }));
    expect(completeSet.mock.calls[0][0].weightKg).toBeCloseTo(82.5, 2);
    expect(completeSet.mock.calls[0][0].rpe).toBeUndefined();
  });

  it("falls back to the target and supports a truthful empty weight state when no history exists", async () => {
    const target = await render(
      <ActiveExerciseLoggingScreen
        completeSet={jest.fn()}
        loadExercise={async () => activeExercise("kg", null, 87.5)}
        onOpenExercise={jest.fn()}
        onOverview={jest.fn()}
      />,
    );
    await target.findByText("Bench Press");
    expect(target.getByLabelText("Weight (kg)")).toHaveProp("value", "87.5");

    const empty = await render(
      <ActiveExerciseLoggingScreen
        completeSet={jest.fn()}
        loadExercise={async () => activeExercise("kg", null)}
        onOpenExercise={jest.fn()}
        onOverview={jest.fn()}
      />,
    );
    await empty.findByText("Bench Press");
    expect(empty.getByLabelText("Weight (kg)")).toHaveProp("value", "");
    expect(empty.getByText("No previous performance yet.")).toBeTruthy();
  });
});
