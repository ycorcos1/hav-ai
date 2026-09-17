import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { Alert } from "react-native";

import { WorkoutHistoryDetailScreen } from "@/features/workouts/screens/WorkoutHistoryDetailScreen";
import type { WorkoutHistoryDetail } from "@/features/workouts/services/workoutApplication";

const detail: WorkoutHistoryDetail = {
  rpePreference: "optional",
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

  it("edits a historical set without losing notes or identity", async () => {
    const original = detail.exercises[0].workoutExercise.sets[1];
    const edited = { ...original, reps: 9, notes: "Adjusted", updatedAt: "2026-09-04T10:00:00.000Z" };
    const editSet = jest.fn().mockResolvedValue({
      set: edited,
      recommendation: null,
      personalRecordState: { persistedState: [], repEvents: [] },
    });
    await render(
      <WorkoutHistoryDetailScreen editSet={editSet} loadWorkout={async () => detail} />,
    );
    await screen.findByText("Push Day");
    await fireEvent.press(screen.getByRole("button", { name: "Edit Working 2 · 80 kg × 8 · RPE 8" }));
    const sheet = within(screen.getByLabelText("Edit historical set"));
    await fireEvent.changeText(sheet.getByLabelText("Reps"), "9");
    await fireEvent.press(sheet.getByRole("button", { name: "Add Set Note" }));
    await fireEvent.changeText(sheet.getByLabelText("Set Note (optional)"), "Adjusted");
    await fireEvent.press(sheet.getByRole("button", { name: "Save Set" }));

    await waitFor(() => expect(editSet).toHaveBeenCalledWith({
      setId: original.id,
      weightKg: 80,
      reps: 9,
      rpe: 8,
      notes: "Adjusted",
    }));
    expect(await screen.findByRole("button", { name: "Edit Working 2 · 80 kg × 9 · RPE 8" }))
      .toBeOnTheScreen();
  });

  it("requires confirmation before deleting the historical workout", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const deleteWorkout = jest.fn().mockResolvedValue(undefined);
    const onDeleted = jest.fn();
    await render(
      <WorkoutHistoryDetailScreen
        deleteWorkout={deleteWorkout}
        loadWorkout={async () => detail}
        onDeleted={onDeleted}
      />,
    );
    await screen.findByText("Push Day");
    await fireEvent.press(screen.getByRole("button", { name: "Delete Workout" }));
    expect(deleteWorkout).not.toHaveBeenCalled();
    const confirm = alert.mock.calls[0][2]?.find(({ text }) => text === "Delete Workout");
    await act(async () => {
      confirm?.onPress?.();
      await Promise.resolve();
    });
    await waitFor(() => expect(deleteWorkout).toHaveBeenCalledTimes(1));
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });
});
