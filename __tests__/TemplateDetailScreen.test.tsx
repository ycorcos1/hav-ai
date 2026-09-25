import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import { TemplateDetailScreen } from "@/features/templates/screens/TemplateDetailScreen";
import type { TemplateDetail } from "@/features/templates/services/templateApplication";
import type { Exercise, Workout, WorkoutTemplate } from "@/shared/contracts";

const time = "2026-08-31T20:00:00.000Z";
const exercise: Exercise = {
  id: "exercise-1", name: "Bench Press", primaryMuscleGroup: "chest",
  secondaryMuscleGroups: [], equipmentType: "barbell", measurementType: "weight_reps",
  isSystem: true, isArchived: false, createdAt: time, updatedAt: time,
};
const template: WorkoutTemplate = {
  id: "template-1", userId: "user-a", name: "Push", isArchived: false,
  exercises: [{
    id: "child-1", userId: "user-a", templateId: "template-1", exerciseId: exercise.id,
    position: 0, targetSets: 3, targetMinReps: 6, targetMaxReps: 8,
    createdAt: time, updatedAt: time,
  }],
  createdAt: time, updatedAt: time,
};
const detail: TemplateDetail = {
  template,
  exercises: [{ exercise, templateExercise: template.exercises[0] }],
};
const startedWorkout: Workout = {
  id: "workout-1",
  userId: "user-a",
  sourceTemplateId: template.id,
  name: template.name,
  status: "active",
  startedAt: time,
  exercises: [],
  createdAt: time,
  updatedAt: time,
};

function inertStartProps() {
  return {
    discardActiveWorkout: jest.fn().mockResolvedValue(undefined),
    onOpenWorkout: jest.fn(),
    startWorkout: jest.fn().mockResolvedValue({ status: "started", workout: startedWorkout }),
  };
}

describe("TemplateDetailScreen start workout", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("starts through the canonical entry point and opens the created workout", async () => {
    const startProps = inertStartProps();
    const rendered = await render(
      <TemplateDetailScreen {...startProps} loadTemplate={async () => detail} />,
    );
    await rendered.findByText("Push");

    await fireEvent.press(rendered.getByRole("button", { name: "Start Workout" }));

    expect(startProps.startWorkout).toHaveBeenCalledWith(template.id);
    expect(startProps.onOpenWorkout).toHaveBeenCalledWith(startedWorkout.id);
  });

  it("blocks duplicate Start presses while the canonical request is pending", async () => {
    let resolveStart!: (result: { status: "started"; workout: Workout }) => void;
    const startWorkout = jest.fn().mockReturnValue(new Promise((resolve) => {
      resolveStart = resolve;
    }));
    const rendered = await render(
      <TemplateDetailScreen
        discardActiveWorkout={jest.fn()}
        loadTemplate={async () => detail}
        onOpenWorkout={jest.fn()}
        startWorkout={startWorkout}
      />,
    );
    await rendered.findByText("Push");

    const startButton = rendered.getByRole("button", { name: "Start Workout" });
    await fireEvent.press(startButton);
    await fireEvent.press(startButton);
    expect(startWorkout).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveStart({ status: "started", workout: startedWorkout });
      await Promise.resolve();
    });
  });

  it("uses the same active-workout discard and retry guard as Home", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const replacement = { ...startedWorkout, id: "replacement-workout" };
    const startWorkout = jest.fn()
      .mockResolvedValueOnce({
        status: "active_workout_exists",
        activeWorkout: startedWorkout,
        requestedTemplateId: template.id,
        options: ["resume", "discard", "cancel"],
      })
      .mockResolvedValueOnce({ status: "started", workout: replacement });
    const discardActiveWorkout = jest.fn().mockResolvedValue(undefined);
    const onOpenWorkout = jest.fn();
    const rendered = await render(
      <TemplateDetailScreen
        discardActiveWorkout={discardActiveWorkout}
        loadTemplate={async () => detail}
        onOpenWorkout={onOpenWorkout}
        startWorkout={startWorkout}
      />,
    );
    await rendered.findByText("Push");
    await fireEvent.press(rendered.getByRole("button", { name: "Start Workout" }));

    const discard = alert.mock.calls[0][2]?.find(({ text }) => text === "Discard");
    discard?.onPress?.();
    const confirm = alert.mock.calls[1][2]?.find(({ text }) => text === "Discard Workout");
    await act(async () => {
      confirm?.onPress?.();
      await Promise.resolve();
    });

    await waitFor(() => expect(discardActiveWorkout).toHaveBeenCalledWith(startedWorkout.id));
    await waitFor(() => expect(startWorkout).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onOpenWorkout).toHaveBeenCalledWith(replacement.id));
  });

  it("keeps the template recoverable after a sanitized start failure", async () => {
    const onOpenWorkout = jest.fn();
    const rendered = await render(
      <TemplateDetailScreen
        discardActiveWorkout={jest.fn()}
        loadTemplate={async () => detail}
        onOpenWorkout={onOpenWorkout}
        startWorkout={async () => { throw new Error("private SQLite details"); }}
      />,
    );
    await rendered.findByText("Push");
    await fireEvent.press(rendered.getByRole("button", { name: "Start Workout" }));

    expect(await rendered.findByText("Your workout could not be started. Nothing was replaced. Try again.")).toBeTruthy();
    expect(rendered.queryByText("private SQLite details")).toBeNull();
    expect(onOpenWorkout).not.toHaveBeenCalled();
  });
});

describe("TemplateDetailScreen duplication", () => {
  it("duplicates once and opens the newly created template", async () => {
    let resolveDuplicate!: (copy: WorkoutTemplate) => void;
    const copy = { ...template, id: "template-copy" };
    const onDuplicate = jest.fn().mockReturnValue(new Promise<WorkoutTemplate>((resolve) => {
      resolveDuplicate = resolve;
    }));
    const onDuplicated = jest.fn();
    const rendered = await render(
      <TemplateDetailScreen
        {...inertStartProps()}
        loadTemplate={async () => detail}
        onDuplicate={onDuplicate}
        onDuplicated={onDuplicated}
      />,
    );
    await rendered.findByText("Push");

    await fireEvent.press(rendered.getByRole("button", { name: "Duplicate Template" }));
    await fireEvent.press(rendered.getByRole("button", { name: "Duplicate Template" }));
    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(onDuplicate).toHaveBeenCalledWith(template.id);
    resolveDuplicate(copy);

    await rendered.findByRole("button", { name: "Duplicate Template" });
    expect(onDuplicated).toHaveBeenCalledWith(copy.id);
  });

  it("shows recoverable sanitized feedback without navigating after duplication fails", async () => {
    const onDuplicated = jest.fn();
    const rendered = await render(
      <TemplateDetailScreen
        {...inertStartProps()}
        loadTemplate={async () => detail}
        onDuplicate={async () => { throw new Error("private SQLite details"); }}
        onDuplicated={onDuplicated}
      />,
    );
    await rendered.findByText("Push");
    await fireEvent.press(rendered.getByRole("button", { name: "Duplicate Template" }));

    expect(await rendered.findByText("This workout could not be duplicated. The original is unchanged. Try again.")).toBeTruthy();
    expect(rendered.queryByText("private SQLite details")).toBeNull();
    expect(onDuplicated).not.toHaveBeenCalled();
    expect(rendered.getByText("Push")).toBeTruthy();
  });
});

describe("TemplateDetailScreen archive", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("requires confirmation and navigates only after archive succeeds", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const onArchive = jest.fn().mockResolvedValue(undefined);
    const onArchived = jest.fn();
    const rendered = await render(
      <TemplateDetailScreen
        {...inertStartProps()}
        loadTemplate={async () => detail}
        onArchive={onArchive}
        onArchived={onArchived}
      />,
    );
    await rendered.findByText("Push");

    await fireEvent.press(rendered.getByRole("button", { name: "Delete Template" }));
    expect(onArchive).not.toHaveBeenCalled();
    expect(onArchived).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      "Delete template?",
      "Push will be removed from your workouts. Historical workouts will not change.",
      expect.any(Array),
    );

    const confirm = alert.mock.calls[0][2]?.find(({ text }) => text === "Delete Template");
    await act(async () => {
      confirm?.onPress?.();
      await Promise.resolve();
    });
    await waitFor(() => expect(onArchive).toHaveBeenCalledWith(template.id));
    await waitFor(() => expect(onArchived).toHaveBeenCalledTimes(1));
  });

  it("keeps the detail recoverable and avoids false success when archive fails", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const onArchived = jest.fn();
    const rendered = await render(
      <TemplateDetailScreen
        {...inertStartProps()}
        loadTemplate={async () => detail}
        onArchive={async () => { throw new Error("private SQLite details"); }}
        onArchived={onArchived}
      />,
    );
    await rendered.findByText("Push");
    await fireEvent.press(rendered.getByRole("button", { name: "Delete Template" }));

    const confirm = alert.mock.calls[0][2]?.find(({ text }) => text === "Delete Template");
    await act(async () => {
      confirm?.onPress?.();
      await Promise.resolve();
    });
    expect(await rendered.findByText("This workout could not be deleted. It is still available. Try again.")).toBeTruthy();
    expect(rendered.queryByText("private SQLite details")).toBeNull();
    expect(rendered.getByText("Push")).toBeTruthy();
    expect(onArchived).not.toHaveBeenCalled();
  });
});
