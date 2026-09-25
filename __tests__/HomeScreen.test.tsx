import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import { HomeScreen } from "@/features/home/screens/HomeScreen";
import type { Workout, WorkoutTemplate } from "@/shared/contracts";

const time = "2026-08-31T23:00:00.000Z";
const template: WorkoutTemplate = {
  id: "template-1", userId: "user-a", name: "Push", isArchived: false,
  exercises: [{
    id: "child-1", userId: "user-a", templateId: "template-1", exerciseId: "exercise-1",
    position: 0, targetSets: 3, targetMinReps: 6, targetMaxReps: 8, createdAt: time, updatedAt: time,
  }],
  createdAt: time, updatedAt: time,
};
const workout: Workout = {
  id: "workout-1", userId: "user-a", sourceTemplateId: template.id, name: template.name,
  status: "active", startedAt: time, exercises: [], createdAt: time, updatedAt: time,
};
const completedWorkout: Workout = {
  ...workout,
  id: "completed-1",
  name: "Upper Body",
  status: "completed",
  completedAt: "2026-09-01T00:05:00.000Z",
  exercises: [{
    id: "completed-exercise-1",
    userId: "user-a",
    workoutId: "completed-1",
    exerciseId: "exercise-1",
    position: 0,
    sets: [{
      id: "completed-set-1",
      userId: "user-a",
      workoutId: "completed-1",
      workoutExerciseId: "completed-exercise-1",
      exerciseId: "exercise-1",
      position: 0,
      setType: "working",
      reps: 8,
      completedAt: "2026-09-01T00:04:00.000Z",
      createdAt: time,
      updatedAt: time,
    }],
    createdAt: time,
    updatedAt: time,
  }],
  updatedAt: "2026-09-01T00:05:00.000Z",
};

describe("HomeScreen no-active state", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows templates, a recent placeholder, and starts a real workout", async () => {
    const onOpenWorkout = jest.fn();
    const startWorkout = jest.fn().mockResolvedValue({ status: "started", workout });
    const rendered = await render(
      <HomeScreen
        discardActiveWorkout={jest.fn()}
        loadHome={async () => ({ activeWorkout: null, recentWorkouts: [], templates: [template] })}
        onOpenHistoryWorkout={jest.fn()}
        onOpenWorkout={onOpenWorkout}
        startWorkout={startWorkout}
      />,
    );
    expect(await rendered.findByText("Ready to Train")).toBeTruthy();
    expect(rendered.getByRole("header", { name: "WORKOUT TEMPLATES" })).toBeTruthy();
    expect(rendered.getByText("Push")).toBeTruthy();
    expect(rendered.getByText("No completed sessions yet")).toBeTruthy();
    expect(
      rendered.getByText(
        "Completed workouts will appear here as your training history grows.",
      ),
    ).toBeTruthy();
    await fireEvent.press(rendered.getByRole("button", { name: "Start Workout" }));
    expect(startWorkout).toHaveBeenCalledWith(template.id);
    expect(onOpenWorkout).toHaveBeenCalledWith(workout.id);
  });

  it("offers a clear path to create the first workout when no templates exist", async () => {
    const onCreateTemplate = jest.fn();
    const rendered = await render(
      <HomeScreen
        discardActiveWorkout={jest.fn()}
        loadHome={async () => ({ activeWorkout: null, recentWorkouts: [], templates: [] })}
        onCreateTemplate={onCreateTemplate}
        onOpenHistoryWorkout={jest.fn()}
        onOpenWorkout={jest.fn()}
        startWorkout={jest.fn()}
      />,
    );

    expect(await rendered.findByText("No workouts yet")).toBeTruthy();
    await fireEvent.press(rendered.getByRole("button", { name: "Create Workout" }));
    expect(onCreateTemplate).toHaveBeenCalledTimes(1);
  });

  it("shows recoverable sanitized feedback and does not navigate after start fails", async () => {
    const onOpenWorkout = jest.fn();
    const rendered = await render(
      <HomeScreen
        discardActiveWorkout={jest.fn()}
        loadHome={async () => ({ activeWorkout: null, recentWorkouts: [], templates: [template] })}
        onOpenHistoryWorkout={jest.fn()}
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

  it("confirms discard, retries the real start once, and opens the replacement", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const discardActiveWorkout = jest.fn().mockResolvedValue(undefined);
    const onOpenWorkout = jest.fn();
    const activeWorkout = { ...workout, id: "active-workout", name: "Pull" };
    const startWorkout = jest.fn()
      .mockResolvedValueOnce({
        status: "active_workout_exists",
        activeWorkout,
        requestedTemplateId: template.id,
        options: ["resume", "discard", "cancel"],
      })
      .mockResolvedValueOnce({ status: "started", workout });
    const rendered = await render(
      <HomeScreen
        discardActiveWorkout={discardActiveWorkout}
        loadHome={async () => ({ activeWorkout: null, recentWorkouts: [], templates: [template] })}
        onOpenHistoryWorkout={jest.fn()}
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

    await waitFor(() => expect(discardActiveWorkout).toHaveBeenCalledWith(activeWorkout.id));
    await waitFor(() => expect(startWorkout).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onOpenWorkout).toHaveBeenCalledWith(workout.id));
  });

  it("shows a completed workout and opens its existing history detail", async () => {
    const onOpenHistoryWorkout = jest.fn();
    const rendered = await render(
      <HomeScreen
        discardActiveWorkout={jest.fn()}
        loadHome={async () => ({
          activeWorkout: null,
          recentWorkouts: [completedWorkout],
          templates: [],
        })}
        onOpenHistoryWorkout={onOpenHistoryWorkout}
        onOpenWorkout={jest.fn()}
        startWorkout={jest.fn()}
      />,
    );

    expect(await rendered.findByText("Upper Body")).toBeTruthy();
    expect(rendered.getByText(/5m · 1 exercise · 1 set/)).toBeTruthy();
    await fireEvent.press(rendered.getByRole("button", { name: "View Upper Body workout history" }));
    expect(onOpenHistoryWorkout).toHaveBeenCalledWith(completedWorkout.id);
  });

  it("shows at most the three newest completed workouts", async () => {
    const workouts = [
      { ...completedWorkout, id: "completed-2", name: "Second", completedAt: "2026-09-02T00:05:00.000Z" },
      { ...completedWorkout, id: "completed-4", name: "Newest", completedAt: "2026-09-04T00:05:00.000Z" },
      { ...completedWorkout, id: "completed-1", name: "Oldest", completedAt: "2026-09-01T00:05:00.000Z" },
      { ...completedWorkout, id: "completed-3", name: "Third", completedAt: "2026-09-03T00:05:00.000Z" },
    ];
    const rendered = await render(
      <HomeScreen
        discardActiveWorkout={jest.fn()}
        loadHome={async () => ({ activeWorkout: null, recentWorkouts: workouts, templates: [] })}
        onOpenHistoryWorkout={jest.fn()}
        onOpenWorkout={jest.fn()}
        startWorkout={jest.fn()}
      />,
    );

    await rendered.findByText("Newest");
    expect(rendered.getAllByRole("button", { name: /workout history/ }).map((row) => row.props.accessibilityLabel))
      .toEqual([
        "View Newest workout history",
        "View Third workout history",
        "View Second workout history",
      ]);
    expect(rendered.queryByText("Oldest")).toBeNull();
  });

  it("reloads recent training after workout completion refreshes Home", async () => {
    const loadHome = jest.fn()
      .mockResolvedValueOnce({ activeWorkout: null, recentWorkouts: [], templates: [] })
      .mockResolvedValueOnce({ activeWorkout: null, recentWorkouts: [completedWorkout], templates: [] });
    const props = {
      discardActiveWorkout: jest.fn(),
      loadHome,
      onOpenHistoryWorkout: jest.fn(),
      onOpenWorkout: jest.fn(),
      startWorkout: jest.fn(),
    };
    const rendered = await render(<HomeScreen {...props} refreshKey={0} />);
    expect(await rendered.findByText("No completed sessions yet")).toBeTruthy();

    await rendered.rerender(<HomeScreen {...props} refreshKey={1} />);

    expect(await rendered.findByText("Upper Body")).toBeTruthy();
    expect(loadHome).toHaveBeenCalledTimes(2);
  });
});

describe("HomeScreen active-workout state", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("lets the persisted active workout dominate Home and resume truthfully", async () => {
    jest.spyOn(Date, "now").mockReturnValue(Date.parse(time) + 12 * 60 * 1000 + 34 * 1000);
    const onOpenWorkout = jest.fn();
    const activeWorkout: Workout = {
      ...workout,
      exercises: [
        {
          id: "workout-exercise-1",
          userId: "user-a",
          workoutId: workout.id,
          exerciseId: "exercise-1",
          position: 0,
          targetSets: 1,
          sets: [{
            id: "set-1",
            userId: "user-a",
            workoutId: workout.id,
            workoutExerciseId: "workout-exercise-1",
            exerciseId: "exercise-1",
            position: 0,
            setType: "working",
            reps: 8,
            completedAt: time,
            createdAt: time,
            updatedAt: time,
          }],
          createdAt: time,
          updatedAt: time,
        },
        {
          id: "workout-exercise-2",
          userId: "user-a",
          workoutId: workout.id,
          exerciseId: "exercise-2",
          position: 1,
          targetSets: 2,
          sets: [],
          createdAt: time,
          updatedAt: time,
        },
      ],
    };
    const loadHome = jest.fn().mockResolvedValue({ activeWorkout, recentWorkouts: [], templates: [template] });
    const rendered = await render(
      <HomeScreen
        discardActiveWorkout={jest.fn()}
        loadHome={loadHome}
        onOpenHistoryWorkout={jest.fn()}
        onOpenWorkout={onOpenWorkout}
        startWorkout={jest.fn()}
      />,
    );

    expect(await rendered.findByText("WORKOUT IN PROGRESS")).toBeTruthy();
    expect(rendered.getByText("Push")).toBeTruthy();
    expect(rendered.getByText("12:34")).toBeTruthy();
    expect(rendered.getByText("1 / 2 exercises")).toBeTruthy();
    expect(rendered.queryByText("Ready to Train")).toBeNull();
    expect(rendered.queryByText("WORKOUT TEMPLATES")).toBeNull();

    await fireEvent.press(rendered.getByRole("button", { name: "Resume Workout" }));
    expect(onOpenWorkout).toHaveBeenCalledWith(activeWorkout.id);
  });

  it("restores the same active state when Home remounts", async () => {
    const loadHome = jest.fn().mockResolvedValue({ activeWorkout: workout, recentWorkouts: [], templates: [] });
    const props = {
      discardActiveWorkout: jest.fn(),
      loadHome,
      onOpenHistoryWorkout: jest.fn(),
      onOpenWorkout: jest.fn(),
      startWorkout: jest.fn(),
    };
    const first = await render(<HomeScreen {...props} />);
    expect(await first.findByText("WORKOUT IN PROGRESS")).toBeTruthy();
    await first.unmount();

    const restored = await render(<HomeScreen {...props} />);
    expect(await restored.findByText("WORKOUT IN PROGRESS")).toBeTruthy();
    expect(loadHome).toHaveBeenCalledTimes(2);
  });
});
