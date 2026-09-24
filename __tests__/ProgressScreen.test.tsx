import { fireEvent, render, screen, userEvent } from "@testing-library/react-native";

import { ProgressScreen } from "@/features/progress/screens/ProgressScreen";
import type { Exercise, DetectedPersonalRecord } from "@/shared/contracts";

const bench: Exercise = {
  id: "bench",
  name: "Bench Press",
  primaryMuscleGroup: "chest",
  secondaryMuscleGroups: ["triceps"],
  equipmentType: "barbell",
  measurementType: "weight_reps",
  isSystem: true,
  isArchived: false,
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
};
const squat = { ...bench, id: "squat", name: "Back Squat", primaryMuscleGroup: "quads" as const };
const record: DetectedPersonalRecord = {
  type: "max_weight",
  exerciseId: bench.id,
  workoutId: "workout-1",
  setId: "set-1",
  weightKg: 100,
  reps: 5,
  achievedAt: "2026-09-03T10:00:00.000Z",
};

describe("ProgressScreen", () => {
  it("shows recent records and searchable exercises", async () => {
    const user = userEvent.setup();
    const onOpenExercise = jest.fn();
    await render(
      <ProgressScreen
        loadProgress={async () => ({
          exercises: [squat, bench],
          recentRecords: [{ exercise: bench, record }],
          weightUnit: "kg",
        })}
        onOpenExercise={onOpenExercise}
      />,
    );
    expect(await screen.findByRole("header", { name: "RECENT PRS" })).toBeOnTheScreen();
    expect(screen.getByText("Best weight · 100 kg × 5")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Bench Press" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Back Squat" })).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText("Search exercises"), "bench");
    expect(screen.queryByRole("button", { name: "Back Squat" })).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Bench Press" }));
    expect(onOpenExercise).toHaveBeenCalledWith("bench");
  });

  it("shows intentional empty states without fabricating progress", async () => {
    await render(
      <ProgressScreen
        loadProgress={async () => ({
          exercises: [],
          recentRecords: [],
          weightUnit: "lb",
        })}
        onOpenExercise={jest.fn()}
      />,
    );

    expect(await screen.findByText("No personal records yet")).toBeOnTheScreen();
    expect(screen.getByText("No exercises yet")).toBeOnTheScreen();
  });

  it("keeps a long exercise list navigable and searchable", async () => {
    const exercises = Array.from({ length: 20 }, (_, index): Exercise => ({
      ...bench,
      id: `exercise-${index}`,
      name: `Exercise ${String(index + 1).padStart(2, "0")}`,
    }));
    const onOpenExercise = jest.fn();
    await render(
      <ProgressScreen
        loadProgress={async () => ({ exercises, recentRecords: [], weightUnit: "kg" })}
        onOpenExercise={onOpenExercise}
      />,
    );

    expect(await screen.findByRole("button", { name: "Exercise 20" })).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Search exercises"), "20");
    expect(screen.queryByRole("button", { name: "Exercise 01" })).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Exercise 20" }));
    expect(onOpenExercise).toHaveBeenCalledWith("exercise-19");
  });
});
