import { fireEvent, render } from "@testing-library/react-native";

import { TemplateExerciseConfigurationSheet } from "@/features/templates/components/TemplateExerciseConfigurationSheet";
import type { Exercise } from "@/shared/contracts";

const exercise: Exercise = {
  id: "exercise-1",
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

describe("TemplateExerciseConfigurationSheet", () => {
  it("rejects invalid ranges and saves complete template-exercise configuration", async () => {
    const onSave = jest.fn();
    const rendered = await render(
      <TemplateExerciseConfigurationSheet exercise={exercise} onDismiss={jest.fn()} onSave={onSave} />,
    );
    await fireEvent.changeText(rendered.getByLabelText("Target Sets"), "3");
    await fireEvent.changeText(rendered.getByLabelText("Minimum Reps"), "10");
    await fireEvent.changeText(rendered.getByLabelText("Maximum Reps"), "8");
    await fireEvent.press(rendered.getByRole("button", { name: "Add to Workout" }));
    expect(await rendered.findByText("Maximum reps must be at least minimum reps.")).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();

    await fireEvent.changeText(rendered.getByLabelText("Maximum Reps"), "12");
    await fireEvent.changeText(rendered.getByLabelText("Exercise Notes (optional)"), "  Pause reps  ");
    await fireEvent.press(rendered.getByRole("button", { name: "Add to Workout" }));
    expect(onSave).toHaveBeenCalledWith({
      exerciseId: exercise.id,
      targetSets: 3,
      targetMinReps: 10,
      targetMaxReps: 12,
      notes: "Pause reps",
    });
  });

  it("starts a fresh configuration draft when the selected exercise changes", async () => {
    const rendered = await render(
      <TemplateExerciseConfigurationSheet exercise={exercise} onDismiss={jest.fn()} onSave={jest.fn()} />,
    );
    await fireEvent.changeText(rendered.getByLabelText("Target Sets"), "5");
    await fireEvent.changeText(rendered.getByLabelText("Exercise Notes (optional)"), "First exercise");

    await rendered.rerender(
      <TemplateExerciseConfigurationSheet
        exercise={{ ...exercise, id: "exercise-2", name: "Cable Row" }}
        onDismiss={jest.fn()}
        onSave={jest.fn()}
      />,
    );

    expect(rendered.getByLabelText("Target Sets")).toHaveProp("value", "");
    expect(rendered.getByLabelText("Exercise Notes (optional)")).toHaveProp("value", "");
    expect(rendered.getByText("Cable Row")).toBeTruthy();
  });
});
