import { act, fireEvent, render, within } from "@testing-library/react-native";

import { ActiveWorkoutOverviewScreen } from "@/features/workouts/screens/ActiveWorkoutOverviewScreen";
import { NetworkStatusProvider } from "@/features/network/components/NetworkStatusProvider";
import type { NetworkStatus, NetworkStatusService } from "@/features/network/networkStatus";
import type { ActiveWorkoutOverview } from "@/features/workouts/services/workoutApplication";
import type { FinishWorkoutResult } from "@/shared/contracts";

const startedAt = "2026-09-02T12:00:00.000Z";
const overview: ActiveWorkoutOverview = {
  workout: {
    id: "workout-1",
    userId: "user-a",
    name: "Push",
    status: "active",
    startedAt,
    exercises: [],
    createdAt: startedAt,
    updatedAt: startedAt,
  },
  exercises: [
    {
      exercise: {
        id: "exercise-1",
        name: "Bench Press",
        primaryMuscleGroup: "chest",
        secondaryMuscleGroups: [],
        equipmentType: "barbell",
        measurementType: "weight_reps",
        isSystem: true,
        isArchived: false,
        createdAt: startedAt,
        updatedAt: startedAt,
      },
      workoutExercise: {
        id: "workout-exercise-1",
        userId: "user-a",
        workoutId: "workout-1",
        exerciseId: "exercise-1",
        position: 0,
        targetSets: 1,
        sets: [{
          id: "set-1",
          userId: "user-a",
          workoutId: "workout-1",
          workoutExerciseId: "workout-exercise-1",
          exerciseId: "exercise-1",
          position: 0,
          setType: "working",
          reps: 8,
          completedAt: startedAt,
          createdAt: startedAt,
          updatedAt: startedAt,
        }],
        createdAt: startedAt,
        updatedAt: startedAt,
      },
    },
    {
      exercise: {
        id: "exercise-2",
        name: "Cable Fly",
        primaryMuscleGroup: "chest",
        secondaryMuscleGroups: [],
        equipmentType: "cable",
        measurementType: "weight_reps",
        isSystem: true,
        isArchived: false,
        createdAt: startedAt,
        updatedAt: startedAt,
      },
      workoutExercise: {
        id: "workout-exercise-2",
        userId: "user-a",
        workoutId: "workout-1",
        exerciseId: "exercise-2",
        position: 1,
        targetSets: 3,
        sets: [],
        createdAt: startedAt,
        updatedAt: startedAt,
      },
    },
  ],
};

describe("ActiveWorkoutOverviewScreen", () => {
  const finishWorkout = jest.fn<Promise<FinishWorkoutResult>, []>();
  const onWorkoutFinished = jest.fn();

  beforeEach(() => {
    finishWorkout.mockReset();
    finishWorkout.mockResolvedValue(finishedResult());
    onWorkoutFinished.mockClear();
  });

  it("shows advisory offline state without blocking workout interaction", async () => {
    const open = jest.fn();
    const service: NetworkStatusService = {
      getCurrentStatus: async () => "offline",
      subscribe: () => () => {},
    };
    const rendered = await render(
      <NetworkStatusProvider service={service}>
        <ActiveWorkoutOverviewScreen
          finishWorkout={finishWorkout}
          loadWorkout={async () => overview}
          onOpenExercise={open}
          onWorkoutFinished={onWorkoutFinished}
          saveWorkoutNote={async () => overview.workout}
        />
      </NetworkStatusProvider>,
    );
    expect(await rendered.findByText("Offline · Saved on device")).toBeTruthy();
    const exerciseButton = rendered.getByRole("button", { name: "Open Cable Fly" });
    expect(exerciseButton).toBeEnabled();
    await fireEvent.press(exerciseButton);
    expect(open).toHaveBeenCalledWith("workout-exercise-2");
  });
  it("identifies the last active row without automatically opening the exercise", async () => {
    const open = jest.fn();
    const rendered = await render(<ActiveWorkoutOverviewScreen
      finishWorkout={finishWorkout}
      loadWorkout={async () => ({ ...overview, lastActiveWorkoutExerciseId: "workout-exercise-2" })}
      onOpenExercise={open}
      onWorkoutFinished={onWorkoutFinished}
      saveWorkoutNote={async () => overview.workout}
    />);
    expect(await rendered.findByText("Last active")).toBeTruthy();
    expect(open).not.toHaveBeenCalled();
    await fireEvent.press(rendered.getByRole("button", { name: "Open Cable Fly" }));
    expect(open).toHaveBeenCalledWith("workout-exercise-2");
  });
  const onOpenExercise = jest.fn();
  const saveWorkoutNote = jest.fn();

  beforeEach(() => {
    onOpenExercise.mockClear();
    saveWorkoutNote.mockReset();
    saveWorkoutNote.mockImplementation(async (notes?: string) => ({
      ...overview.workout,
      ...(notes?.trim() ? { notes: notes.trim() } : { notes: undefined }),
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows the persisted workout snapshot in exercise order", async () => {
    jest.spyOn(Date, "now").mockReturnValue(Date.parse(startedAt) + 42 * 60 * 1000 + 18 * 1000);
    const rendered = await render(
      <ActiveWorkoutOverviewScreen
        finishWorkout={finishWorkout}
        loadWorkout={async () => overview}
        onOpenExercise={onOpenExercise}
        onWorkoutFinished={onWorkoutFinished}
        saveWorkoutNote={saveWorkoutNote}
      />,
    );

    expect(await rendered.findByText("Push")).toBeTruthy();
    expect(rendered.getByText("42:18")).toBeTruthy();
    expect(rendered.getByText("1 / 2 exercises")).toBeTruthy();
    const names = rendered.getAllByText(/Bench Press|Cable Fly/);
    expect(names.map(({ props }) => props.children)).toEqual(["Bench Press", "Cable Fly"]);
    expect(rendered.getByText("Complete")).toBeTruthy();
    expect(rendered.getByText("0/3 sets")).toBeTruthy();
    expect(rendered.getByRole("button", { name: "Add Exercise" })).toBeDisabled();
    expect(rendered.getByRole("button", { name: "Finish Workout" })).toBeEnabled();
    await fireEvent.press(rendered.getByRole("button", { name: "Open Cable Fly" }));
    expect(onOpenExercise).toHaveBeenCalledWith("workout-exercise-2");
  });

  it("adds an exercise through the shared library picker without changing the source template", async () => {
    const addedExercise = {
      ...overview.exercises[1].exercise!,
      id: "exercise-3",
      name: "Lat Pulldown",
      primaryMuscleGroup: "back" as const,
    };
    const addedOverview: ActiveWorkoutOverview = {
      ...overview,
      workout: {
        ...overview.workout,
        sourceTemplateId: "template-1",
        exercises: [...overview.exercises.map(({ workoutExercise }) => workoutExercise), {
          id: "workout-exercise-3",
          userId: "user-a",
          workoutId: "workout-1",
          exerciseId: addedExercise.id,
          position: 2,
          sets: [],
          createdAt: startedAt,
          updatedAt: startedAt,
        }],
      },
      exercises: [...overview.exercises, {
        exercise: addedExercise,
        workoutExercise: {
          id: "workout-exercise-3",
          userId: "user-a",
          workoutId: "workout-1",
          exerciseId: addedExercise.id,
          position: 2,
          sets: [],
          createdAt: startedAt,
          updatedAt: startedAt,
        },
      }],
    };
    const addExercise = jest.fn().mockResolvedValue(addedOverview);
    const rendered = await render(
      <ActiveWorkoutOverviewScreen
        addExercise={addExercise}
        finishWorkout={finishWorkout}
        loadExercises={async () => [addedExercise]}
        loadPreferences={async () => []}
        loadWorkout={async () => overview}
        onOpenExercise={onOpenExercise}
        onWorkoutFinished={onWorkoutFinished}
        saveWorkoutNote={saveWorkoutNote}
      />,
    );

    await fireEvent.press(await rendered.findByRole("button", { name: "Add Exercise" }));
    const picker = await rendered.findByLabelText("Add exercise picker");
    await fireEvent.press(within(picker).getByRole("button", { name: "Select Lat Pulldown" }));
    expect(addExercise).toHaveBeenCalledWith("exercise-3");
    expect(await rendered.findByText("Lat Pulldown")).toBeOnTheScreen();
    expect(addedOverview.workout.sourceTemplateId).toBe("template-1");
  });

  it("reorders only the active session with contiguous positions", async () => {
    const reordered: ActiveWorkoutOverview = {
      ...overview,
      exercises: [
        { ...overview.exercises[1], workoutExercise: { ...overview.exercises[1].workoutExercise, position: 0 } },
        { ...overview.exercises[0], workoutExercise: { ...overview.exercises[0].workoutExercise, position: 1 } },
      ],
      workout: {
        ...overview.workout,
        exercises: [
          { ...overview.exercises[1].workoutExercise, position: 0 },
          { ...overview.exercises[0].workoutExercise, position: 1 },
        ],
      },
    };
    const moveExercise = jest.fn().mockResolvedValue(reordered);
    const rendered = await render(
      <ActiveWorkoutOverviewScreen
        finishWorkout={finishWorkout}
        loadWorkout={async () => overview}
        moveExercise={moveExercise}
        onOpenExercise={onOpenExercise}
        onWorkoutFinished={onWorkoutFinished}
        saveWorkoutNote={saveWorkoutNote}
      />,
    );

    await fireEvent.press(await rendered.findByRole("button", { name: "Move Cable Fly up" }));
    expect(moveExercise).toHaveBeenCalledWith("workout-exercise-2", "up");
    const names = rendered.getAllByText(/Bench Press|Cable Fly/);
    expect(names.map(({ props }) => props.children)).toEqual(["Cable Fly", "Bench Press"]);
  });

  it("requires confirmation before removing completed exercise data", async () => {
    const removed: ActiveWorkoutOverview = {
      ...overview,
      exercises: [overview.exercises[1]],
      workout: { ...overview.workout, exercises: [overview.exercises[1].workoutExercise] },
    };
    const removeExercise = jest.fn().mockResolvedValue(removed);
    const rendered = await render(
      <ActiveWorkoutOverviewScreen
        finishWorkout={finishWorkout}
        loadWorkout={async () => overview}
        onOpenExercise={onOpenExercise}
        onWorkoutFinished={onWorkoutFinished}
        removeExercise={removeExercise}
        saveWorkoutNote={saveWorkoutNote}
      />,
    );

    await fireEvent.press(await rendered.findByRole("button", { name: "Remove Bench Press" }));
    const confirmation = rendered.getByLabelText("Remove exercise confirmation");
    expect(removeExercise).not.toHaveBeenCalled();
    await fireEvent.press(within(confirmation).getByRole("button", { name: "Remove Exercise" }));
    expect(removeExercise).toHaveBeenCalledWith("workout-exercise-1");
    expect(rendered.queryByText("Bench Press")).toBeNull();
  });

  it("removes an exercise with no completed data without destructive confirmation", async () => {
    const removed: ActiveWorkoutOverview = {
      ...overview,
      exercises: [overview.exercises[0]],
      workout: { ...overview.workout, exercises: [overview.exercises[0].workoutExercise] },
    };
    const removeExercise = jest.fn().mockResolvedValue(removed);
    const rendered = await render(
      <ActiveWorkoutOverviewScreen
        finishWorkout={finishWorkout}
        loadWorkout={async () => overview}
        onOpenExercise={onOpenExercise}
        onWorkoutFinished={onWorkoutFinished}
        removeExercise={removeExercise}
        saveWorkoutNote={saveWorkoutNote}
      />,
    );

    await fireEvent.press(await rendered.findByRole("button", { name: "Remove Cable Fly" }));
    expect(removeExercise).toHaveBeenCalledWith("workout-exercise-2");
    expect(rendered.queryByLabelText("Remove exercise confirmation")).toBeNull();
  });

  it("requires confirmation for incomplete planned work and allows keeping training", async () => {
    const rendered = await render(
      <ActiveWorkoutOverviewScreen
        finishWorkout={finishWorkout}
        loadWorkout={async () => overview}
        onOpenExercise={onOpenExercise}
        onWorkoutFinished={onWorkoutFinished}
        saveWorkoutNote={saveWorkoutNote}
      />,
    );

    await rendered.findByText("Push");
    await fireEvent.press(rendered.getByRole("button", { name: "Finish Workout" }));
    expect(rendered.getByLabelText("Finish workout confirmation")).toBeOnTheScreen();
    expect(rendered.getByText("You still have planned sets/exercises remaining.")).toBeOnTheScreen();
    expect(rendered.getByText("1 planned exercise incomplete")).toBeOnTheScreen();
    expect(finishWorkout).not.toHaveBeenCalled();
    await fireEvent.press(rendered.getByRole("button", { name: "Keep Training" }));
    expect(rendered.queryByLabelText("Finish workout confirmation")).toBeNull();
  });

  it("finishes incomplete work only after confirmation and navigates after local success", async () => {
    const rendered = await render(
      <ActiveWorkoutOverviewScreen
        finishWorkout={finishWorkout}
        loadWorkout={async () => overview}
        onOpenExercise={onOpenExercise}
        onWorkoutFinished={onWorkoutFinished}
        saveWorkoutNote={saveWorkoutNote}
      />,
    );

    await rendered.findByText("Push");
    await fireEvent.press(rendered.getByRole("button", { name: "Finish Workout" }));
    const confirmation = rendered.getByLabelText("Finish workout confirmation");
    await fireEvent.press(within(confirmation).getByRole("button", { name: "Finish Workout" }));
    expect(finishWorkout).toHaveBeenCalledTimes(1);
    expect(onWorkoutFinished).toHaveBeenCalledWith(finishedResult());
  });

  it("finishes complete planned work immediately without showing confirmation", async () => {
    const completeOverview: ActiveWorkoutOverview = {
      ...overview,
      exercises: overview.exercises.map(({ exercise, workoutExercise }) => ({
        exercise,
        workoutExercise: {
          ...workoutExercise,
          targetSets: 1,
          sets: workoutExercise.sets.length > 0
            ? workoutExercise.sets
            : [{ ...overview.exercises[0].workoutExercise.sets[0], id: "set-2", exerciseId: workoutExercise.exerciseId, workoutExerciseId: workoutExercise.id }],
        },
      })),
    };
    const rendered = await render(
      <ActiveWorkoutOverviewScreen
        finishWorkout={finishWorkout}
        loadWorkout={async () => completeOverview}
        onOpenExercise={onOpenExercise}
        onWorkoutFinished={onWorkoutFinished}
        saveWorkoutNote={saveWorkoutNote}
      />,
    );

    await rendered.findByText("Push");
    await fireEvent.press(rendered.getByRole("button", { name: "Finish Workout" }));
    expect(finishWorkout).toHaveBeenCalledTimes(1);
    expect(rendered.queryByLabelText("Finish workout confirmation")).toBeNull();
    expect(onWorkoutFinished).toHaveBeenCalledTimes(1);
  });

  it("keeps the confirmation recoverable and blocks duplicate finish submissions", async () => {
    let rejectFinish: ((reason?: unknown) => void) | undefined;
    finishWorkout.mockImplementationOnce(() => new Promise((_resolve, reject) => {
      rejectFinish = reject;
    }));
    const rendered = await render(
      <ActiveWorkoutOverviewScreen
        finishWorkout={finishWorkout}
        loadWorkout={async () => overview}
        onOpenExercise={onOpenExercise}
        onWorkoutFinished={onWorkoutFinished}
        saveWorkoutNote={saveWorkoutNote}
      />,
    );

    await rendered.findByText("Push");
    await fireEvent.press(rendered.getByRole("button", { name: "Finish Workout" }));
    const confirmation = rendered.getByLabelText("Finish workout confirmation");
    const confirm = within(confirmation).getByRole("button", { name: "Finish Workout" });
    await fireEvent.press(confirm);
    await fireEvent.press(confirm);
    expect(finishWorkout).toHaveBeenCalledTimes(1);
    await act(async () => rejectFinish?.(new Error("private storage failure")));
    expect(await rendered.findByText("Unable to finish the workout. Your local workout is still available.")).toBeOnTheScreen();
    expect(rendered.queryByText("private storage failure")).toBeNull();
    expect(onWorkoutFinished).not.toHaveBeenCalled();
  });

  it("shows a recoverable sanitized load failure", async () => {
    const loadWorkout = jest.fn()
      .mockRejectedValueOnce(new Error("private persistence detail"))
      .mockResolvedValueOnce(overview);
    const rendered = await render(
      <ActiveWorkoutOverviewScreen
        finishWorkout={finishWorkout}
        loadWorkout={loadWorkout}
        onOpenExercise={onOpenExercise}
        onWorkoutFinished={onWorkoutFinished}
        saveWorkoutNote={saveWorkoutNote}
      />,
    );

    expect(await rendered.findByText("Your active workout could not be loaded. Your local data was not changed.")).toBeTruthy();
    expect(rendered.queryByText("private persistence detail")).toBeNull();
    await fireEvent.press(rendered.getByRole("button", { name: "Try Again" }));
    expect(await rendered.findByText("Push")).toBeTruthy();
    expect(loadWorkout).toHaveBeenCalledTimes(2);
  });

  it("handles a missing workout without inventing state", async () => {
    const rendered = await render(
      <ActiveWorkoutOverviewScreen
        finishWorkout={finishWorkout}
        loadWorkout={async () => null}
        onOpenExercise={onOpenExercise}
        onWorkoutFinished={onWorkoutFinished}
        saveWorkoutNote={saveWorkoutNote}
      />,
    );

    expect(await rendered.findByText("This active workout is no longer available.")).toBeTruthy();
    expect(rendered.queryByRole("button", { name: "Try Again" })).toBeNull();
  });

  it("edits and immediately reflects the active workout note", async () => {
    const withNote = {
      ...overview,
      workout: { ...overview.workout, notes: "Initial workout note" },
    };
    const rendered = await render(
      <ActiveWorkoutOverviewScreen
        finishWorkout={finishWorkout}
        loadWorkout={async () => withNote}
        onOpenExercise={onOpenExercise}
        onWorkoutFinished={onWorkoutFinished}
        saveWorkoutNote={saveWorkoutNote}
      />,
    );

    expect(await rendered.findByText("Initial workout note")).toBeTruthy();
    await fireEvent.press(rendered.getByRole("button", { name: "Edit Workout Note" }));
    const input = rendered.getByLabelText("Workout note");
    expect(input.props.value).toBe("Initial workout note");
    await fireEvent.changeText(input, " Updated workout note ");
    await fireEvent.press(rendered.getByRole("button", { name: "Save Workout Note" }));

    expect(saveWorkoutNote).toHaveBeenCalledWith(" Updated workout note ");
    expect(await rendered.findByText("Updated workout note")).toBeTruthy();
  });

  it("supports an empty note state and clearing a saved note", async () => {
    const rendered = await render(
      <ActiveWorkoutOverviewScreen
        finishWorkout={finishWorkout}
        loadWorkout={async () => overview}
        onOpenExercise={onOpenExercise}
        onWorkoutFinished={onWorkoutFinished}
        saveWorkoutNote={saveWorkoutNote}
      />,
    );

    expect(await rendered.findByText("No workout note.")).toBeTruthy();
    await fireEvent.press(rendered.getByRole("button", { name: "Add Workout Note" }));
    await fireEvent.changeText(rendered.getByLabelText("Workout note"), "   ");
    await fireEvent.press(rendered.getByRole("button", { name: "Save Workout Note" }));
    expect(await rendered.findByText("No workout note.")).toBeTruthy();
  });

  it("preserves the draft after a sanitized persistence failure", async () => {
    saveWorkoutNote.mockRejectedValueOnce(new Error("private storage detail"));
    const rendered = await render(
      <ActiveWorkoutOverviewScreen
        finishWorkout={finishWorkout}
        loadWorkout={async () => overview}
        onOpenExercise={onOpenExercise}
        onWorkoutFinished={onWorkoutFinished}
        saveWorkoutNote={saveWorkoutNote}
      />,
    );

    await rendered.findByText("No workout note.");
    await fireEvent.press(rendered.getByRole("button", { name: "Add Workout Note" }));
    await fireEvent.changeText(rendered.getByLabelText("Workout note"), "Keep this draft");
    await fireEvent.press(rendered.getByRole("button", { name: "Save Workout Note" }));

    expect(await rendered.findByText("Unable to save the workout note. Your draft was preserved.")).toBeTruthy();
    expect(rendered.getByLabelText("Workout note").props.value).toBe("Keep this draft");
    expect(rendered.queryByText("private storage detail")).toBeNull();
  });

  it("prevents duplicate simultaneous note saves", async () => {
    let resolveSave: ((workout: ActiveWorkoutOverview["workout"]) => void) | undefined;
    saveWorkoutNote.mockImplementationOnce(() => new Promise((resolve) => {
      resolveSave = resolve;
    }));
    const rendered = await render(
      <ActiveWorkoutOverviewScreen
        finishWorkout={finishWorkout}
        loadWorkout={async () => overview}
        onOpenExercise={onOpenExercise}
        onWorkoutFinished={onWorkoutFinished}
        saveWorkoutNote={saveWorkoutNote}
      />,
    );

    await rendered.findByText("No workout note.");
    await fireEvent.press(rendered.getByRole("button", { name: "Add Workout Note" }));
    await fireEvent.changeText(rendered.getByLabelText("Workout note"), "One save");
    const saveButton = rendered.getByRole("button", { name: "Save Workout Note" });
    await fireEvent.press(saveButton);
    await fireEvent.press(saveButton);
    expect(saveWorkoutNote).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSave?.({ ...overview.workout, notes: "One save" });
    });
    expect(await rendered.findByText("One save")).toBeTruthy();
    await rendered.unmount();
  });
});

function finishedResult(): FinishWorkoutResult {
  return {
    workout: { ...overview.workout, status: "completed", completedAt: startedAt },
    summary: {
      workoutId: overview.workout.id,
      durationSeconds: 0,
      exerciseCount: 2,
      workingSetCount: 1,
      exerciseSummaries: [],
    },
    recommendations: [],
    personalRecords: [],
  };
}
