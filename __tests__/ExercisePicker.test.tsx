import { fireEvent, render } from "@testing-library/react-native";

import { ExercisePicker } from "@/features/exercises/components/ExercisePicker";
import { discoverExercises } from "@/features/exercises/services/discoverExercises";
import type { Exercise } from "@/shared/contracts";

const base: Exercise = {
  id: "system-1",
  name: "Bench Press",
  primaryMuscleGroup: "chest",
  secondaryMuscleGroups: ["triceps"],
  equipmentType: "barbell",
  measurementType: "weight_reps",
  isSystem: true,
  isArchived: false,
  createdAt: "2026-08-31T14:00:00.000Z",
  updatedAt: "2026-08-31T14:00:00.000Z",
};
const custom: Exercise = { ...base, id: "custom-1", ownerUserId: "user-a", name: "My Press", isSystem: false };
const archived: Exercise = { ...custom, id: "archived-1", name: "Old Press", isArchived: true };
const backExercise: Exercise = {
  ...base,
  id: "system-2",
  name: "Cable Row",
  primaryMuscleGroup: "back",
  secondaryMuscleGroups: ["biceps"],
  equipmentType: "cable",
};

describe("ExercisePicker", () => {
  it("selects system and custom exercises but excludes archived custom exercises", async () => {
    const onSelect = jest.fn();
    const rendered = await render(<ExercisePicker exercises={[base, custom, archived]} onSelect={onSelect} />);
    expect(rendered.queryByText("Old Press")).toBeNull();
    await fireEvent.press(rendered.getByRole("button", { name: "Select Bench Press" }));
    await fireEvent.press(rendered.getByRole("button", { name: "Select My Press" }));
    expect(onSelect).toHaveBeenNthCalledWith(1, base);
    expect(onSelect).toHaveBeenNthCalledWith(2, custom);
  });

  it("reuses search, favorites, and muscle-group discovery", async () => {
    const rendered = await render(
      <ExercisePicker exercises={[base, custom, backExercise]} favoriteIds={new Set([custom.id])} onSelect={jest.fn()} />,
    );
    await fireEvent.press(rendered.getByRole("button", { name: "Favorites" }));
    expect(rendered.getByText("My Press")).toBeTruthy();
    expect(rendered.queryByText("Bench Press")).toBeNull();
    await fireEvent.press(rendered.getByRole("button", { name: "All" }));
    await fireEvent.press(rendered.getByRole("button", { name: "Back" }));
    expect(rendered.getByText("Cable Row")).toBeTruthy();
    expect(rendered.queryByText("Bench Press")).toBeNull();
    await fireEvent.press(rendered.getByRole("button", { name: "All" }));
    await fireEvent.changeText(rendered.getByLabelText("Search"), "bench");
    expect(rendered.getByText("Bench Press")).toBeTruthy();
  });

  it("uses deterministic source order for the curated Popular section", () => {
    const popularExercises = Array.from({ length: 7 }, (_, index) => ({
      ...base,
      id: `system-${index + 1}`,
      name: `System Exercise ${index + 1}`,
    }));

    expect(
      discoverExercises(popularExercises, new Set(), "popular", "", "all").map(
        (exercise) => exercise.id,
      ),
    ).toEqual(popularExercises.slice(0, 6).map((exercise) => exercise.id));
  });

  it("isolates Favorites to the supplied user's local favorite IDs", () => {
    expect(
      discoverExercises(
        [base, custom, backExercise],
        new Set([custom.id]),
        "favorites",
        "",
        "all",
      ).map((exercise) => exercise.id),
    ).toEqual([custom.id]);

    expect(
      discoverExercises(
        [base, custom, backExercise],
        new Set([backExercise.id]),
        "favorites",
        "",
        "all",
      ).map((exercise) => exercise.id),
    ).toEqual([backExercise.id]);
  });

  it("exposes the canonical muscle taxonomy without Swap or Skip actions", async () => {
    const rendered = await render(
      <ExercisePicker exercises={[base, custom, backExercise]} onSelect={jest.fn()} />,
    );

    for (const label of [
      "Chest",
      "Back",
      "Shoulders",
      "Biceps",
      "Triceps",
      "Quads",
      "Hamstrings",
      "Glutes",
      "Calves",
      "Core",
    ]) {
      expect(rendered.getByRole("button", { name: label })).toBeTruthy();
    }
    expect(rendered.queryByRole("button", { name: /swap/i })).toBeNull();
    expect(rendered.queryByRole("button", { name: /skip/i })).toBeNull();
  });
});
