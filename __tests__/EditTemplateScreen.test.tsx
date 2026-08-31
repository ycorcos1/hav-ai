import { fireEvent, render } from "@testing-library/react-native";

import { EditTemplateScreen } from "@/features/templates/screens/EditTemplateScreen";
import type { TemplateDetail } from "@/features/templates/services/templateApplication";
import type { Exercise, WorkoutTemplate } from "@/shared/contracts";

const time = "2026-08-31T18:00:00.000Z";
const exercise = (id: string, name: string, isSystem = true): Exercise => ({
  id, name, ...(isSystem ? {} : { ownerUserId: "user-a" }), primaryMuscleGroup: "chest",
  secondaryMuscleGroups: [], equipmentType: "barbell", measurementType: "weight_reps",
  isSystem, isArchived: false, createdAt: time, updatedAt: time,
});
const bench = exercise("exercise-1", "Bench Press");
const fly = exercise("exercise-2", "Cable Fly");
const custom = exercise("exercise-3", "My Press", false);
const template: WorkoutTemplate = {
  id: "template-1", userId: "user-a", name: "Push", notes: "Original note", isArchived: false,
  exercises: [
    { id: "child-1", userId: "user-a", templateId: "template-1", exerciseId: bench.id, position: 0, targetSets: 3, targetMinReps: 6, targetMaxReps: 8, notes: "Pause", createdAt: time, updatedAt: time },
    { id: "child-2", userId: "user-a", templateId: "template-1", exerciseId: fly.id, position: 1, targetSets: 4, targetMinReps: 10, targetMaxReps: 12, createdAt: time, updatedAt: time },
  ],
  createdAt: time, updatedAt: time,
};
const detail: TemplateDetail = {
  template,
  exercises: [
    { exercise: bench, templateExercise: template.exercises[0] },
    { exercise: fly, templateExercise: template.exercises[1] },
  ],
};

describe("EditTemplateScreen", () => {
  it("renders an accessible loading state while the template is unresolved", async () => {
    const rendered = await render(
      <EditTemplateScreen
        loadExercises={async () => []}
        loadPreferences={async () => []}
        loadTemplate={() => new Promise(() => undefined)}
        onSave={async () => template}
        onSaved={jest.fn()}
      />,
    );

    expect(rendered.getByLabelText("Loading workout editor")).toBeTruthy();
  });

  it("loads, edits, removes, adds, reorders, and saves existing template configuration", async () => {
    const onSave = jest.fn().mockResolvedValue(template);
    const onSaved = jest.fn();
    const rendered = await render(
      <EditTemplateScreen
        loadExercises={async () => [bench, fly, custom]}
        loadPreferences={async () => []}
        loadTemplate={async () => detail}
        onSave={onSave}
        onSaved={onSaved}
      />,
    );
    expect(await rendered.findByDisplayValue("Push")).toBeTruthy();
    expect(rendered.getByDisplayValue("Original note")).toBeTruthy();

    await fireEvent.changeText(rendered.getByLabelText("Workout Name"), "Push Updated");
    await fireEvent.changeText(rendered.getByLabelText("Notes (optional)"), "Updated note");
    await fireEvent.press(rendered.getAllByRole("button", { name: "Edit Exercise" })[0]);
    expect(rendered.getByLabelText("Target Sets")).toHaveProp("value", "3");
    await fireEvent.changeText(rendered.getByLabelText("Target Sets"), "5");
    await fireEvent.changeText(rendered.getByLabelText("Exercise Notes (optional)"), "Updated pause");
    await fireEvent.press(rendered.getByRole("button", { name: "Save Exercise" }));

    await fireEvent.press(rendered.getByRole("button", { name: "Move Cable Fly up" }));
    await fireEvent.press(rendered.getByRole("button", { name: "Remove Cable Fly" }));
    await fireEvent.press(rendered.getByRole("button", { name: "Add Exercise" }));
    expect(await rendered.findByRole("button", { name: "Select My Press" })).toBeTruthy();
    await fireEvent.press(rendered.getByRole("button", { name: "Select My Press" }));
    await fireEvent.changeText(rendered.getByLabelText("Target Sets"), "4");
    await fireEvent.changeText(rendered.getByLabelText("Minimum Reps"), "8");
    await fireEvent.changeText(rendered.getByLabelText("Maximum Reps"), "10");
    await fireEvent.press(rendered.getByRole("button", { name: "Add to Workout" }));
    await fireEvent.press(rendered.getByRole("button", { name: "Save Changes" }));

    expect(onSave).toHaveBeenCalledWith({
      name: "Push Updated",
      notes: "Updated note",
      exercises: [
        { id: "child-1", exerciseId: bench.id, targetSets: 5, targetMinReps: 6, targetMaxReps: 8, notes: "Updated pause" },
        { exerciseId: custom.id, targetSets: 4, targetMinReps: 8, targetMaxReps: 10 },
      ],
    });
    expect(onSaved).toHaveBeenCalledWith(template.id);
  });

  it("rejects invalid edited state and keeps recoverable state after persistence failure", async () => {
    const onSaved = jest.fn();
    const rendered = await render(
      <EditTemplateScreen
        loadExercises={async () => [bench, fly]}
        loadPreferences={async () => []}
        loadTemplate={async () => detail}
        onSave={async () => { throw new Error("private storage details"); }}
        onSaved={onSaved}
      />,
    );
    expect(await rendered.findByDisplayValue("Push")).toBeTruthy();
    await fireEvent.press(rendered.getByRole("button", { name: "Remove Bench Press" }));
    await fireEvent.press(rendered.getByRole("button", { name: "Remove Cable Fly" }));
    await fireEvent.press(rendered.getByRole("button", { name: "Save Changes" }));
    expect(await rendered.findByText("Add at least one exercise.")).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();

    await fireEvent.press(rendered.getByRole("button", { name: "Add Exercise" }));
    await rendered.findByRole("button", { name: "Select Bench Press" });
    await fireEvent.press(rendered.getByRole("button", { name: "Select Bench Press" }));
    await fireEvent.changeText(rendered.getByLabelText("Target Sets"), "3");
    await fireEvent.changeText(rendered.getByLabelText("Minimum Reps"), "6");
    await fireEvent.changeText(rendered.getByLabelText("Maximum Reps"), "8");
    await fireEvent.press(rendered.getByRole("button", { name: "Add to Workout" }));
    await fireEvent.press(rendered.getByRole("button", { name: "Save Changes" }));
    expect(await rendered.findByText("Your workout wasn't saved. Your changes are still here. Try again.")).toBeTruthy();
    expect(rendered.getByDisplayValue("Push")).toBeTruthy();
    expect(rendered.queryByText("private storage details")).toBeNull();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
