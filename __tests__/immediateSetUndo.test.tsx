import { act, fireEvent, render } from "@testing-library/react-native";

import {
  ActiveExerciseLoggingScreen,
  SET_COMPLETION_UNDO_DURATION_MS,
  type ActiveExerciseLoggingScreenProps,
} from "@/features/workouts/screens/ActiveExerciseLoggingScreen";
import type { ActiveWorkoutExercise } from "@/features/workouts/services/workoutApplication";
import type {
  CompleteSetInput,
  CompleteSetResult,
  WorkoutSet,
} from "@/shared/contracts";

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Medium: "medium" },
  impactAsync: jest.fn().mockResolvedValue(undefined),
}));

const time = "2026-09-09T12:00:00.000Z";

function setFromInput(id: string, input: CompleteSetInput): WorkoutSet {
  return {
    id,
    userId: "user-a",
    workoutId: input.workoutId,
    workoutExerciseId: input.workoutExerciseId,
    exerciseId: input.exerciseId,
    position: Number(id.replace("set-", "")) - 1,
    setType: input.setType,
    ...(input.weightKg === undefined ? {} : { weightKg: input.weightKg }),
    reps: input.reps,
    ...(input.rpe === undefined ? {} : { rpe: input.rpe }),
    ...(input.notes === undefined ? {} : { notes: input.notes }),
    completedAt: time,
    createdAt: time,
    updatedAt: time,
  };
}

function activeExercise(overrides: Partial<ActiveWorkoutExercise> = {}): ActiveWorkoutExercise {
  const workoutExercise = {
    id: "workout-exercise-1",
    userId: "user-a",
    workoutId: "workout-1",
    exerciseId: "exercise-1",
    position: 0,
    targetSets: 3,
    targetWeightKg: 82.5,
    sets: [],
    createdAt: time,
    updatedAt: time,
  };
  const workout = {
    id: "workout-1",
    userId: "user-a",
    name: "Push",
    status: "active" as const,
    startedAt: time,
    exercises: [workoutExercise],
    createdAt: time,
    updatedAt: time,
  };
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
      weightUnit: "lb",
      primaryGoal: "hybrid",
      rpePreference: "optional",
      progressionStyle: "balanced",
      defaultRestDurationSeconds: 120,
      onboardingCompleted: true,
      createdAt: time,
      updatedAt: time,
    },
    previousPerformance: null,
    workout,
    workoutExercise,
    ...overrides,
  };
}

async function renderScreen(
  completeSet: ActiveExerciseLoggingScreenProps["completeSet"],
  undoSet: NonNullable<ActiveExerciseLoggingScreenProps["undoSet"]>,
  exercise = activeExercise(),
) {
  return render(
    <ActiveExerciseLoggingScreen
      completeSet={completeSet}
      loadExercise={async () => exercise}
      onOpenExercise={jest.fn()}
      onOverview={jest.fn()}
      undoSet={undoSet}
    />,
  );
}

async function enterRequiredDraft(
  rendered: Awaited<ReturnType<typeof render>>,
  weight: string,
  reps: string,
): Promise<void> {
  await fireEvent.changeText(rendered.getByLabelText(/Weight/), weight);
  await fireEvent.changeText(rendered.getByLabelText("Reps"), reps);
}

describe("immediate set completion Undo", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(time));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("restores the exact pound draft, RPE, note disclosure, and working type", async () => {
    const completeSet = jest.fn(async (input: CompleteSetInput): Promise<CompleteSetResult> => ({
      set: setFromInput("set-1", input),
    }));
    const undoSet = jest.fn().mockResolvedValue({ restoredDraft: { reps: 7 } });
    const rendered = await renderScreen(completeSet, undoSet);
    await rendered.findByText("Bench Press");

    await enterRequiredDraft(rendered, "182.250", "7");
    await fireEvent.press(rendered.getByRole("button", { name: "Select RPE" }));
    await fireEvent.press(rendered.getByRole("button", { name: "8.5" }));
    await fireEvent.press(rendered.getByRole("button", { name: "Add Set Note" }));
    await fireEvent.changeText(rendered.getByLabelText("Set Note (optional)"), "  smooth reps  ");
    await fireEvent.press(rendered.getByRole("button", { name: "Complete Set" }));

    expect(await rendered.findByLabelText("Set completion undo")).toBeTruthy();
    await fireEvent.press(rendered.getByRole("button", { name: "Undo" }));

    expect(undoSet).toHaveBeenCalledWith("set-1");
    expect(rendered.getByLabelText("Weight (lb)")).toHaveProp("value", "182.250");
    expect(rendered.getByLabelText("Reps")).toHaveProp("value", "7");
    expect(rendered.getByRole("button", { name: "RPE 8.5" })).toBeTruthy();
    expect(rendered.getByLabelText("Set Note (optional)")).toHaveProp(
      "value",
      "  smooth reps  ",
    );
    expect(rendered.queryByText("WARM-UP SET")).toBeNull();
    expect(rendered.queryByLabelText("Set completion undo")).toBeNull();
  });

  it("restores a decimal kilogram quick-adjusted warm-up draft", async () => {
    const exercise = activeExercise();
    exercise.profile = { ...exercise.profile, weightUnit: "kg" };
    const completeSet = jest.fn(async (input: CompleteSetInput): Promise<CompleteSetResult> => ({
      set: setFromInput("set-1", input),
    }));
    const rendered = await renderScreen(completeSet, jest.fn().mockResolvedValue({}), exercise);
    await rendered.findByText("Bench Press");

    await fireEvent.press(rendered.getByRole("button", { name: "Add Warm-Up Set" }));
    await fireEvent.changeText(rendered.getByLabelText("Weight (kg)"), "40");
    await fireEvent.press(rendered.getByRole("button", { name: "Increase weight by 2.5 kg" }));
    await fireEvent.changeText(rendered.getByLabelText("Reps"), "10");
    await fireEvent.press(rendered.getByRole("button", { name: "Complete Set" }));
    await fireEvent.press(await rendered.findByRole("button", { name: "Undo" }));

    expect(rendered.getByText("WARM-UP SET")).toBeTruthy();
    expect(rendered.getByLabelText("Weight (kg)")).toHaveProp("value", "42.5");
    expect(rendered.getByLabelText("Reps")).toHaveProp("value", "10");
  });

  it("expires after five seconds and rejects a stale Undo callback", async () => {
    const completeSet = jest.fn(async (input: CompleteSetInput): Promise<CompleteSetResult> => ({
      set: setFromInput("set-1", input),
    }));
    const undoSet = jest.fn().mockResolvedValue({});
    const rendered = await renderScreen(completeSet, undoSet);
    await rendered.findByText("Bench Press");
    await enterRequiredDraft(rendered, "180", "8");
    await fireEvent.press(rendered.getByRole("button", { name: "Complete Set" }));
    const staleUndo = await rendered.findByRole("button", { name: "Undo" });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(SET_COMPLETION_UNDO_DURATION_MS);
    });
    expect(rendered.queryByRole("button", { name: "Undo" })).toBeNull();
    await fireEvent.press(staleUndo);
    expect(undoSet).not.toHaveBeenCalled();
    expect(rendered.getByText(/Set 1:/)).toBeTruthy();
  });

  it("replaces only after a newer success and preserves the prior Undo on failure", async () => {
    let nextId = 1;
    const completeSet = jest.fn(async (input: CompleteSetInput): Promise<CompleteSetResult> => ({
      set: setFromInput(`set-${nextId++}`, input),
    }));
    const undoSet = jest.fn().mockResolvedValue({});
    const rendered = await renderScreen(completeSet, undoSet);
    await rendered.findByText("Bench Press");

    await enterRequiredDraft(rendered, "180", "8");
    await fireEvent.press(rendered.getByRole("button", { name: "Complete Set" }));
    await enterRequiredDraft(rendered, "185", "7");
    completeSet.mockRejectedValueOnce(new Error("save failed"));
    await fireEvent.press(rendered.getByRole("button", { name: "Complete Set" }));
    expect(rendered.getByRole("button", { name: "Undo" })).toBeTruthy();

    completeSet.mockImplementationOnce(async (input: CompleteSetInput) => ({
      set: setFromInput(`set-${nextId++}`, input),
    }));
    await fireEvent.press(rendered.getByRole("button", { name: "Complete Set" }));
    await fireEvent.press(rendered.getByRole("button", { name: "Undo" }));

    expect(undoSet).toHaveBeenCalledTimes(1);
    expect(undoSet).toHaveBeenCalledWith("set-2");
    expect(rendered.getByText(/Set 1:/)).toBeTruthy();
    expect(rendered.queryByText(/Set 2:/)).toBeNull();
  });

  it("keeps the completed set and current draft when persistence Undo fails", async () => {
    const completeSet = jest.fn(async (input: CompleteSetInput): Promise<CompleteSetResult> => ({
      set: setFromInput("set-1", input),
    }));
    const undoSet = jest.fn().mockRejectedValue(new Error("storage failed"));
    const rendered = await renderScreen(completeSet, undoSet);
    await rendered.findByText("Bench Press");
    await enterRequiredDraft(rendered, "180", "8");
    await fireEvent.press(rendered.getByRole("button", { name: "Complete Set" }));
    await fireEvent.press(await rendered.findByRole("button", { name: "Undo" }));

    expect(rendered.getByText(/Set 1:/)).toBeTruthy();
    expect(rendered.getByRole("alert")).toHaveTextContent(
      "This set could not be undone. It remains in your workout.",
    );
    expect(rendered.getByLabelText("Reps")).toHaveProp("value", "");
  });
});
