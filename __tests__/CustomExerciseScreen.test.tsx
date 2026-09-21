import { act, fireEvent, render } from "@testing-library/react-native";

import type { LocalExerciseRepository } from "@/db/repositories";
import { CustomExerciseScreen } from "@/features/exercises/screens/CustomExerciseScreen";
import type { Exercise } from "@/shared/contracts";

const userId = "user-a";
const time = "2026-09-21T12:00:00.000Z";

describe("CustomExerciseScreen", () => {
  it("blocks duplicate create submissions while the local save is pending", async () => {
    let resolveSave: (() => void) | undefined;
    const repository = exerciseRepository({
      upsert: jest.fn(() => new Promise<void>((resolve) => { resolveSave = resolve; })),
    });
    const onSaved = jest.fn();
    const screen = await render(
      <CustomExerciseScreen repository={repository} userId={userId} onSaved={onSaved} />,
    );

    await fireEvent.changeText(screen.getByLabelText("Name"), "Cable Press");
    const save = screen.getByRole("button", { name: "Save Exercise" });
    await fireEvent.press(save);
    await fireEvent.press(save);
    expect(repository.upsert).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();

    await act(async () => resolveSave?.());
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("keeps entries and sanitizes a local storage failure", async () => {
    const repository = exerciseRepository({
      upsert: jest.fn().mockRejectedValue(new Error("private sqlite detail")),
    });
    const screen = await render(
      <CustomExerciseScreen repository={repository} userId={userId} onSaved={jest.fn()} />,
    );

    await fireEvent.changeText(screen.getByLabelText("Name"), "Cable Press");
    await fireEvent.press(screen.getByRole("button", { name: "Save Exercise" }));
    expect(await screen.findByText(
      "Your exercise wasn't safely saved. Your entries are still here. Try again.",
    )).toBeOnTheScreen();
    expect(screen.getByDisplayValue("Cable Press")).toBeOnTheScreen();
    expect(screen.queryByText("private sqlite detail")).toBeNull();
  });

  it("keeps validation inline without attempting persistence", async () => {
    const repository = exerciseRepository();
    const screen = await render(
      <CustomExerciseScreen repository={repository} userId={userId} onSaved={jest.fn()} />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Save Exercise" }));
    expect(await screen.findByText("Enter an exercise name.")).toBeOnTheScreen();
    expect(repository.upsert).not.toHaveBeenCalled();
  });
});

function exerciseRepository(
  overrides: Partial<LocalExerciseRepository> = {},
): LocalExerciseRepository {
  const exercise: Exercise = {
    id: "exercise-a",
    ownerUserId: userId,
    name: "Cable Press",
    primaryMuscleGroup: "chest",
    secondaryMuscleGroups: [],
    equipmentType: "cable",
    measurementType: "weight_reps",
    isSystem: false,
    isArchived: false,
    createdAt: time,
    updatedAt: time,
  };
  return {
    archiveCustomExercise: jest.fn(),
    getById: jest.fn().mockResolvedValue(exercise),
    listAccessible: jest.fn().mockResolvedValue([]),
    search: jest.fn().mockResolvedValue([]),
    upsert: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
