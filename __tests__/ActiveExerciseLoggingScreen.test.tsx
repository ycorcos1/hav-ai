import { fireEvent, render } from "@testing-library/react-native";

import { ActiveExerciseLoggingScreen } from "@/features/workouts/screens/ActiveExerciseLoggingScreen";
import type { ActiveWorkoutExercise } from "@/features/workouts/services/workoutApplication";

const time = "2026-09-02T12:00:00.000Z";
const activeExercise: ActiveWorkoutExercise = {
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
  previousPerformance: null,
  workout: {
    id: "workout-1",
    userId: "user-a",
    name: "Push",
    status: "active",
    startedAt: time,
    exercises: [
      {
        id: "workout-exercise-3",
        userId: "user-a",
        workoutId: "workout-1",
        exerciseId: "exercise-3",
        position: 2,
        sets: [],
        createdAt: time,
        updatedAt: time,
      },
      {
        id: "workout-exercise-1",
        userId: "user-a",
        workoutId: "workout-1",
        exerciseId: "exercise-1",
        position: 0,
        sets: [],
        createdAt: time,
        updatedAt: time,
      },
      {
        id: "workout-exercise-2",
        userId: "user-a",
        workoutId: "workout-1",
        exerciseId: "exercise-2",
        position: 1,
        sets: [],
        createdAt: time,
        updatedAt: time,
      },
    ],
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
    targetMinReps: 6,
    targetMaxReps: 8,
    targetWeightKg: 82.5,
    sets: [],
    createdAt: time,
    updatedAt: time,
  },
};

describe("ActiveExerciseLoggingScreen", () => {
  const onOpenExercise = jest.fn();
  const onOverview = jest.fn();

  beforeEach(() => {
    onOpenExercise.mockClear();
    onOverview.mockClear();
  });

  it("renders the active snapshot without claiming a set was completed", async () => {
    const rendered = await render(
      <ActiveExerciseLoggingScreen
        loadExercise={async () => activeExercise}
        onOpenExercise={onOpenExercise}
        onOverview={onOverview}
      />,
    );

    expect(await rendered.findByText("Bench Press")).toBeTruthy();
    expect(rendered.getByText("Push")).toBeTruthy();
    expect(rendered.getByText("82.5 kg")).toBeTruthy();
    expect(rendered.getByText("3 × 6-8 reps")).toBeTruthy();
    expect(rendered.getByText("No previous performance yet.")).toBeTruthy();
    expect(rendered.getByText("No sets completed yet.")).toBeTruthy();
    expect(rendered.getByRole("button", { name: "Complete Set" })).toBeDisabled();
  });

  it("renders only real comparable working sets beside today's target", async () => {
    const rendered = await render(
      <ActiveExerciseLoggingScreen
        loadExercise={async () => ({
          ...activeExercise,
          previousPerformance: {
            workoutId: "completed-workout",
            completedAt: time,
            sets: [
              { weightKg: 80, reps: 8 },
              { weightKg: 80, reps: 7, rpe: 9 },
            ],
          },
        })}
        onOpenExercise={onOpenExercise}
        onOverview={onOverview}
      />,
    );

    expect(await rendered.findByText("Set 1: 80 kg × 8")).toBeTruthy();
    expect(rendered.getByText("Set 2: 80 kg × 7")).toBeTruthy();
    expect(rendered.queryByText("No previous performance yet.")).toBeNull();
    expect(rendered.getByText("3 × 6-8 reps")).toBeTruthy();
  });

  it("surfaces the user's persistent exercise note outside the structured target", async () => {
    const rendered = await render(
      <ActiveExerciseLoggingScreen
        loadExercise={async () => ({
          ...activeExercise,
          exercisePreference: {
            id: "preference-1",
            userId: "user-a",
            exerciseId: "exercise-1",
            isFavorite: false,
            notes: "Seat 4 · Bench notch 3",
            createdAt: time,
            updatedAt: time,
          },
        })}
        onOpenExercise={onOpenExercise}
        onOverview={onOverview}
      />,
    );

    expect(await rendered.findByLabelText("Your persistent exercise note")).toBeTruthy();
    expect(rendered.getByText("YOUR EXERCISE NOTE")).toBeTruthy();
    expect(rendered.getByText("Seat 4 · Bench notch 3")).toBeTruthy();
    expect(rendered.getByText("TODAY'S TARGET")).toBeTruthy();
  });

  it("keeps a missing persistent note unobtrusive", async () => {
    const rendered = await render(
      <ActiveExerciseLoggingScreen
        loadExercise={async () => activeExercise}
        onOpenExercise={onOpenExercise}
        onOverview={onOverview}
      />,
    );

    await rendered.findByText("Bench Press");
    expect(rendered.queryByLabelText("Your persistent exercise note")).toBeNull();
    expect(rendered.queryByText("YOUR EXERCISE NOTE")).toBeNull();
  });

  it("shows a recoverable sanitized loading error", async () => {
    const loadExercise = jest.fn()
      .mockRejectedValueOnce(new Error("private local detail"))
      .mockResolvedValueOnce(activeExercise);
    const rendered = await render(
      <ActiveExerciseLoggingScreen
        loadExercise={loadExercise}
        onOpenExercise={onOpenExercise}
        onOverview={onOverview}
      />,
    );

    expect(await rendered.findByText("This exercise could not be loaded. Your workout was not changed.")).toBeTruthy();
    expect(rendered.queryByText("private local detail")).toBeNull();
    await fireEvent.press(rendered.getByRole("button", { name: "Try Again" }));
    expect(await rendered.findByText("Bench Press")).toBeTruthy();
  });

  it("rejects an invalid workout-exercise combination without unrelated data", async () => {
    const rendered = await render(
      <ActiveExerciseLoggingScreen
        loadExercise={async () => null}
        onOpenExercise={onOpenExercise}
        onOverview={onOverview}
      />,
    );

    expect(await rendered.findByText("This exercise is not part of the active workout.")).toBeTruthy();
    expect(rendered.queryByText("Bench Press")).toBeNull();
  });

  it("switches by persisted position without wrapping at either boundary", async () => {
    const middle = {
      ...activeExercise,
      exercise: null,
      workoutExercise: activeExercise.workout.exercises[2],
    };
    const rendered = await render(
      <ActiveExerciseLoggingScreen
        loadExercise={async () => middle}
        onOpenExercise={onOpenExercise}
        onOverview={onOverview}
      />,
    );
    await rendered.findByText("Exercise unavailable");

    await fireEvent.press(rendered.getByRole("button", { name: "Previous Exercise" }));
    expect(onOpenExercise).toHaveBeenLastCalledWith("workout-exercise-1");
    await fireEvent.press(rendered.getByRole("button", { name: "Next Exercise" }));
    expect(onOpenExercise).toHaveBeenLastCalledWith("workout-exercise-3");
    await fireEvent.press(rendered.getByRole("button", { name: "Workout Overview" }));
    expect(onOverview).toHaveBeenCalledTimes(1);

    const first = await render(
      <ActiveExerciseLoggingScreen
        loadExercise={async () => ({
          ...activeExercise,
          workoutExercise: activeExercise.workout.exercises[1],
        })}
        onOpenExercise={onOpenExercise}
        onOverview={onOverview}
      />,
    );
    expect(await first.findByRole("button", { name: "Previous Exercise" })).toBeDisabled();
    expect(first.getByRole("button", { name: "Next Exercise" })).toBeEnabled();

    const last = await render(
      <ActiveExerciseLoggingScreen
        loadExercise={async () => ({
          ...activeExercise,
          workoutExercise: activeExercise.workout.exercises[0],
        })}
        onOpenExercise={onOpenExercise}
        onOverview={onOverview}
      />,
    );
    expect(await last.findByRole("button", { name: "Previous Exercise" })).toBeEnabled();
    expect(last.getByRole("button", { name: "Next Exercise" })).toBeDisabled();
  });
});
