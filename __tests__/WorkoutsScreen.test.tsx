import { fireEvent, render } from "@testing-library/react-native";

import { WorkoutsScreen } from "@/features/workouts/screens/WorkoutsScreen";
import type { WorkoutTemplate } from "@/shared/contracts";

const template: WorkoutTemplate = {
  id: "template-1",
  userId: "user-a",
  name: "Push",
  notes: "Main day",
  isArchived: false,
  exercises: [{
    id: "template-exercise-1",
    userId: "user-a",
    templateId: "template-1",
    exerciseId: "exercise-1",
    position: 0,
    targetSets: 3,
    targetMinReps: 6,
    targetMaxReps: 8,
    createdAt: "2026-08-31T14:00:00.000Z",
    updatedAt: "2026-08-31T14:00:00.000Z",
  }],
  createdAt: "2026-08-31T14:00:00.000Z",
  updatedAt: "2026-08-31T14:00:00.000Z",
};

describe("WorkoutsScreen", () => {
  it("shows an actionable empty state", async () => {
    const onCreate = jest.fn();
    const rendered = await render(<WorkoutsScreen loadTemplates={async () => []} onCreate={onCreate} onOpen={jest.fn()} />);
    expect(await rendered.findByText("No workouts yet")).toBeTruthy();
    fireEvent.press(rendered.getByRole("button", { name: "Create Workout" }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("shows local templates, exercise count, open action, and disabled start", async () => {
    const onOpen = jest.fn();
    const rendered = await render(<WorkoutsScreen loadTemplates={async () => [template]} onCreate={jest.fn()} onOpen={onOpen} />);
    expect(await rendered.findByText("Push")).toBeTruthy();
    expect(rendered.getByText("1 exercise")).toBeTruthy();
    fireEvent.press(rendered.getByRole("button", { name: "Open Template" }));
    expect(onOpen).toHaveBeenCalledWith(template.id);
    expect(rendered.getByRole("button", { name: "Start" })).toHaveProp(
      "accessibilityState",
      expect.objectContaining({ disabled: true }),
    );
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
