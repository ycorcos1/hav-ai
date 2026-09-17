import { fireEvent, render } from "@testing-library/react-native";

import { WorkoutSummaryScreen } from "@/features/workouts/screens/WorkoutSummaryScreen";
import type { CompletedWorkoutSummary } from "@/features/workouts/services/workoutApplication";

const time = "2026-09-17T12:00:00.000Z";
const result: CompletedWorkoutSummary = {
  workout: {
    id: "workout-a",
    userId: "user-a",
    name: "Push",
    status: "completed",
    startedAt: time,
    completedAt: "2026-09-17T13:04:00.000Z",
    exercises: [],
    createdAt: time,
    updatedAt: "2026-09-17T13:04:00.000Z",
  },
  summary: {
    workoutId: "workout-a",
    durationSeconds: 3840,
    exerciseCount: 2,
    workingSetCount: 5,
    exerciseSummaries: [
      {
        exerciseId: "exercise-a",
        totalWorkingSets: 3,
        totalReps: 24,
        previousTotalReps: 22,
        repDelta: 2,
        bestSet: { weightKg: 82.5, reps: 8 },
        detectedPRs: [],
      },
      {
        exerciseId: "exercise-b",
        totalWorkingSets: 2,
        totalReps: 20,
        detectedPRs: ["rep_pr", "estimated_1rm"],
      },
    ],
  },
  exercises: [
    {
      exercise: {
        id: "exercise-a",
        name: "Incline Bench",
        primaryMuscleGroup: "chest",
        secondaryMuscleGroups: [],
        equipmentType: "barbell",
        measurementType: "weight_reps",
        isSystem: true,
        isArchived: false,
        createdAt: time,
        updatedAt: time,
      },
      summary: {
        exerciseId: "exercise-a",
        totalWorkingSets: 3,
        totalReps: 24,
        previousTotalReps: 22,
        repDelta: 2,
        bestSet: { weightKg: 82.5, reps: 8 },
        detectedPRs: [],
      },
    },
    {
      exercise: null,
      summary: {
        exerciseId: "exercise-b",
        totalWorkingSets: 2,
        totalReps: 20,
        detectedPRs: ["rep_pr", "estimated_1rm"],
      },
    },
  ],
  personalRecords: [],
};

describe("WorkoutSummaryScreen", () => {
  it("shows completion metrics, exercise progress, PR events, and the next-target placeholder", async () => {
    const onDone = jest.fn();
    const screen = await render(
      <WorkoutSummaryScreen loadSummary={async () => result} onDone={onDone} />,
    );

    expect(await screen.findByText("WORKOUT COMPLETE")).toBeOnTheScreen();
    expect(screen.getByText("Push")).toBeOnTheScreen();
    expect(screen.getByText("1h 04m")).toBeOnTheScreen();
    expect(screen.getByText("5")).toBeOnTheScreen();
    expect(screen.getByText("Incline Bench")).toBeOnTheScreen();
    expect(screen.getByText("↑ +2 total reps")).toBeOnTheScreen();
    expect(screen.getByText("Exercise unavailable")).toBeOnTheScreen();
    expect(screen.getByText("No previous session comparison")).toBeOnTheScreen();
    expect(screen.getByText("NEW REP PR")).toBeOnTheScreen();
    expect(screen.getByText("NEW ESTIMATED 1RM PR")).toBeOnTheScreen();
    expect(screen.getByText("Next targets will appear after progression is available.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Done" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("retries a sanitized loading failure", async () => {
    const loadSummary = jest.fn()
      .mockRejectedValueOnce(new Error("private storage detail"))
      .mockResolvedValueOnce(result);
    const screen = await render(
      <WorkoutSummaryScreen loadSummary={loadSummary} onDone={jest.fn()} />,
    );

    expect(await screen.findByText("Your locally saved workout summary could not be loaded.")).toBeOnTheScreen();
    expect(screen.queryByText("private storage detail")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Try Again" }));
    expect(await screen.findByText("WORKOUT COMPLETE")).toBeOnTheScreen();
    expect(loadSummary).toHaveBeenCalledTimes(2);
  });

  it("offers Done when the completed workout is unavailable", async () => {
    const onDone = jest.fn();
    const screen = await render(
      <WorkoutSummaryScreen loadSummary={async () => null} onDone={onDone} />,
    );

    expect(await screen.findByText("This completed workout is not available.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Done" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
