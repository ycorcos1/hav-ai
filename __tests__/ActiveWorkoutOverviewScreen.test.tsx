import { fireEvent, render } from "@testing-library/react-native";

import { ActiveWorkoutOverviewScreen } from "@/features/workouts/screens/ActiveWorkoutOverviewScreen";
import type { ActiveWorkoutOverview } from "@/features/workouts/services/workoutApplication";

const startedAt = "2026-09-02T12:00:00.000Z";
const overview: ActiveWorkoutOverview = {
  workout: {
    id: "workout-1",
    userId: "user-a",
    name: "Push",
    status: "active",
    startedAt,
    exercises: [],
    createdAt: startedAt,
    updatedAt: startedAt,
  },
  exercises: [
    {
      exercise: {
        id: "exercise-1",
        name: "Bench Press",
        primaryMuscleGroup: "chest",
        secondaryMuscleGroups: [],
        equipmentType: "barbell",
        measurementType: "weight_reps",
        isSystem: true,
        isArchived: false,
        createdAt: startedAt,
        updatedAt: startedAt,
      },
      workoutExercise: {
        id: "workout-exercise-1",
        userId: "user-a",
        workoutId: "workout-1",
        exerciseId: "exercise-1",
        position: 0,
        targetSets: 1,
        sets: [{
          id: "set-1",
          userId: "user-a",
          workoutId: "workout-1",
          workoutExerciseId: "workout-exercise-1",
          exerciseId: "exercise-1",
          position: 0,
          setType: "working",
          reps: 8,
          completedAt: startedAt,
          createdAt: startedAt,
          updatedAt: startedAt,
        }],
        createdAt: startedAt,
        updatedAt: startedAt,
      },
    },
    {
      exercise: {
        id: "exercise-2",
        name: "Cable Fly",
        primaryMuscleGroup: "chest",
        secondaryMuscleGroups: [],
        equipmentType: "cable",
        measurementType: "weight_reps",
        isSystem: true,
        isArchived: false,
        createdAt: startedAt,
        updatedAt: startedAt,
      },
      workoutExercise: {
        id: "workout-exercise-2",
        userId: "user-a",
        workoutId: "workout-1",
        exerciseId: "exercise-2",
        position: 1,
        targetSets: 3,
        sets: [],
        createdAt: startedAt,
        updatedAt: startedAt,
      },
    },
  ],
};

describe("ActiveWorkoutOverviewScreen", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows the persisted workout snapshot in exercise order", async () => {
    jest.spyOn(Date, "now").mockReturnValue(Date.parse(startedAt) + 42 * 60 * 1000 + 18 * 1000);
    const rendered = await render(<ActiveWorkoutOverviewScreen loadWorkout={async () => overview} />);

    expect(await rendered.findByText("Push")).toBeTruthy();
    expect(rendered.getByText("42:18")).toBeTruthy();
    expect(rendered.getByText("1 / 2 exercises")).toBeTruthy();
    const names = rendered.getAllByText(/Bench Press|Cable Fly/);
    expect(names.map(({ props }) => props.children)).toEqual(["Bench Press", "Cable Fly"]);
    expect(rendered.getByText("Complete")).toBeTruthy();
    expect(rendered.getByText("0/3 sets")).toBeTruthy();
    expect(rendered.getByRole("button", { name: "Add Exercise" })).toBeDisabled();
    expect(rendered.getByRole("button", { name: "Finish Workout" })).toBeDisabled();
  });

  it("shows a recoverable sanitized load failure", async () => {
    const loadWorkout = jest.fn()
      .mockRejectedValueOnce(new Error("private persistence detail"))
      .mockResolvedValueOnce(overview);
    const rendered = await render(<ActiveWorkoutOverviewScreen loadWorkout={loadWorkout} />);

    expect(await rendered.findByText("Your active workout could not be loaded. Your local data was not changed.")).toBeTruthy();
    expect(rendered.queryByText("private persistence detail")).toBeNull();
    await fireEvent.press(rendered.getByRole("button", { name: "Try Again" }));
    expect(await rendered.findByText("Push")).toBeTruthy();
    expect(loadWorkout).toHaveBeenCalledTimes(2);
  });

  it("handles a missing workout without inventing state", async () => {
    const rendered = await render(<ActiveWorkoutOverviewScreen loadWorkout={async () => null} />);

    expect(await rendered.findByText("This active workout is no longer available.")).toBeTruthy();
    expect(rendered.queryByRole("button", { name: "Try Again" })).toBeNull();
  });
});
