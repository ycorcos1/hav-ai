import { useState } from "react";
import { fireEvent, render } from "@testing-library/react-native";

import {
  NewTemplateScreen,
  type TemplateExerciseSelection,
} from "@/features/templates/screens/NewTemplateScreen";
import type { WorkoutTemplate } from "@/shared/contracts";

const selection: TemplateExerciseSelection = {
  exercise: {
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
  },
  exerciseId: "exercise-1",
  targetSets: 3,
  targetMinReps: 6,
  targetMaxReps: 8,
  notes: "Pause at the bottom",
};

function savedTemplate(): WorkoutTemplate {
  return {
    id: "template-1",
    userId: "user-a",
    name: "Push",
    isArchived: false,
    exercises: [],
    createdAt: "2026-08-31T14:00:00.000Z",
    updatedAt: "2026-08-31T14:00:00.000Z",
  };
}

function TestNewTemplateScreen(props: Omit<React.ComponentProps<typeof NewTemplateScreen>, "name" | "notes" | "onNameChange" | "onNotesChange">) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <NewTemplateScreen
      {...props}
      name={name}
      notes={notes}
      onNameChange={setName}
      onNotesChange={setNotes}
    />
  );
}

describe("NewTemplateScreen", () => {
  it("rejects an empty name and zero exercises", async () => {
    const onSave = jest.fn();
    const rendered = await render(<TestNewTemplateScreen exercises={[]} onAddExercise={jest.fn()} onSave={onSave} onSaved={jest.fn()} />);
    await fireEvent.press(rendered.getByRole("button", { name: "Save Workout" }));
    expect(await rendered.findByText("Enter a workout name.")).toBeTruthy();
    await fireEvent.changeText(rendered.getByLabelText("Workout Name"), "Push");
    await fireEvent.press(rendered.getByRole("button", { name: "Save Workout" }));
    expect(await rendered.findByText("Add at least one exercise.")).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves a valid template once and navigates only after persistence succeeds", async () => {
    let resolveSave!: (template: WorkoutTemplate) => void;
    const onSave = jest.fn().mockReturnValue(new Promise<WorkoutTemplate>((resolve) => { resolveSave = resolve; }));
    const onSaved = jest.fn();
    const rendered = await render(<TestNewTemplateScreen exercises={[selection]} onAddExercise={jest.fn()} onSave={onSave} onSaved={onSaved} />);
    await fireEvent.changeText(rendered.getByLabelText("Workout Name"), " Push ");
    await fireEvent.press(rendered.getByRole("button", { name: "Save Workout" }));
    await fireEvent.press(rendered.getByRole("button", { name: "Save Workout" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
    resolveSave(savedTemplate());
    expect(await rendered.findByText("Bench Press")).toBeTruthy();
    await Promise.resolve();
    expect(onSaved).toHaveBeenCalledWith("template-1");
  });

  it("keeps form data and shows sanitized feedback when persistence fails", async () => {
    const rendered = await render(
      <TestNewTemplateScreen
        exercises={[selection]}
        onAddExercise={jest.fn()}
        onSave={async () => { throw new Error("private SQLite details"); }}
        onSaved={jest.fn()}
      />,
    );
    await fireEvent.changeText(rendered.getByLabelText("Workout Name"), "Push");
    await fireEvent.press(rendered.getByRole("button", { name: "Save Workout" }));
    expect(await rendered.findByText("Your workout wasn't saved. Your changes are still here. Try again.")).toBeTruthy();
    expect(rendered.getByDisplayValue("Push")).toBeTruthy();
    expect(rendered.queryByText("private SQLite details")).toBeNull();
  });
});
