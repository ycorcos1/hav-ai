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
    expect(await screen.findByText("Recent PRs")).toBeOnTheScreen();
    expect(screen.getByText("Best weight · 100 kg × 5")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Bench Press" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Back Squat" })).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText("Search exercises"), "bench");
    expect(screen.queryByRole("button", { name: "Back Squat" })).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Bench Press" }));
    expect(onOpenExercise).toHaveBeenCalledWith("bench");
  });
});
