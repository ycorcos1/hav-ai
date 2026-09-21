import { fireEvent, render } from "@testing-library/react-native";

import { WorkoutSummaryScreen } from "@/features/workouts/screens/WorkoutSummaryScreen";
import { NetworkStatusProvider } from "@/features/network/components/NetworkStatusProvider";
import type { NetworkStatusService } from "@/features/network/networkStatus";
import type { CompletedWorkoutSummary } from "@/features/workouts/services/workoutApplication";
import type { ProgressionRecommendation } from "@/shared/contracts";

const time = "2026-09-17T12:00:00.000Z";
const recommendation: ProgressionRecommendation = {
  id: "recommendation-a",
  userId: "user-a",
  exerciseId: "exercise-a",
  sourceWorkoutId: "workout-a",
  recommendationType: "increase_reps",
  recommendedWeightKg: 82.5,
  targetSets: 3,
  targetMinReps: 6,
  targetMaxReps: 8,
  targetSetReps: [8, 8, 7],
  confidence: "high",
  reasonCodes: ["WITHIN_TARGET_RANGE", "TOTAL_REPS_IMPROVED"],
  status: "active",
  engineVersion: "progression-v1",
  createdAt: time,
  updatedAt: time,
};
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
        nextRecommendation: recommendation,
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
        nextRecommendation: recommendation,
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
  weightUnit: "kg",
};

describe("WorkoutSummaryScreen", () => {
  it("shows completion metrics, exercise progress, PR events, and the next target", async () => {
    const onDone = jest.fn();
    const screen = await render(
      <WorkoutSummaryScreen loadSummary={async () => result} onDone={onDone} />,
    );

    expect(await screen.findByText("WORKOUT COMPLETE")).toBeOnTheScreen();
    expect(screen.getByText("Push")).toBeOnTheScreen();
    expect(screen.getByText("1h 04m")).toBeOnTheScreen();
    expect(screen.getByText("5")).toBeOnTheScreen();
    expect(screen.getAllByText("Incline Bench")).toHaveLength(2);
    expect(screen.getByText("↑ +2 total reps")).toBeOnTheScreen();
    expect(screen.getByText("Exercise unavailable")).toBeOnTheScreen();
    expect(screen.getByText("No previous session comparison")).toBeOnTheScreen();
    expect(screen.getByText("NEW REP PR")).toBeOnTheScreen();
    expect(screen.getByText("NEW ESTIMATED 1RM PR")).toBeOnTheScreen();
    expect(screen.getByLabelText("Next target for Incline Bench")).toBeOnTheScreen();
    expect(screen.getByText("82.5 kg")).toBeOnTheScreen();
    expect(screen.getByText("8 / 8 / 7")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Why?" }));
    expect(screen.getByText("Add reps at the same load")).toBeOnTheScreen();
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

  it("shows deterministic reasons immediately and optional richer AI context", async () => {
    const loadAIExplanation = jest.fn().mockResolvedValue({
      headline: "Keep building at this load",
      summary: "The canonical target reflects improved total reps.",
      evidence: ["You completed two more reps than the comparable session."],
      meta: { promptVersion: "explanation-v1" },
    });
    const screen = await render(
      <WorkoutSummaryScreen
        loadAIExplanation={loadAIExplanation}
        loadSummary={async () => result}
        onDone={jest.fn()}
      />,
    );

    expect(await screen.findByText("82.5 kg")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Why?" }));
    expect(screen.getByText("Add reps at the same load")).toBeOnTheScreen();
    expect(screen.getByText(/Your total completed reps improved across comparable sessions/)).toBeOnTheScreen();
    expect(await screen.findByText("Keep building at this load")).toBeOnTheScreen();
    expect(loadAIExplanation).toHaveBeenCalledWith(recommendation.id);
  });

  it("keeps the target and deterministic fallback visible when AI explanation fails", async () => {
    const screen = await render(
      <WorkoutSummaryScreen
        loadAIExplanation={jest.fn().mockRejectedValue(new Error("provider detail"))}
        loadSummary={async () => result}
        onDone={jest.fn()}
      />,
    );

    expect(await screen.findByText("82.5 kg")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Why?" }));
    expect(await screen.findByText(/Couldn't generate the richer explanation/)).toBeOnTheScreen();
    expect(screen.getByText("82.5 kg")).toBeOnTheScreen();
    expect(screen.getByText("Add reps at the same load")).toBeOnTheScreen();
    expect(screen.queryByText("provider detail")).toBeNull();
  });

  it("keeps deterministic reasons available without invoking AI while offline", async () => {
    const loadAIExplanation = jest.fn();
    const offlineService: NetworkStatusService = {
      getCurrentStatus: async () => "offline",
      subscribe: () => () => {},
    };
    const screen = await render(
      <NetworkStatusProvider service={offlineService}>
        <WorkoutSummaryScreen
          loadAIExplanation={loadAIExplanation}
          loadSummary={async () => result}
          onDone={jest.fn()}
        />
      </NetworkStatusProvider>,
    );

    expect(await screen.findByText("82.5 kg")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Why?" }));
    expect(screen.getByText("Add reps at the same load")).toBeOnTheScreen();
    expect(screen.getByText("AI explanation requires an internet connection.")).toBeOnTheScreen();
    expect(loadAIExplanation).not.toHaveBeenCalled();
  });

  it("shows broad mixed-load guidance without claiming a precise rep target", async () => {
    const mixedRecommendation: ProgressionRecommendation = {
      ...recommendation,
      recommendationType: "maintain_weight",
      targetSetReps: undefined,
      confidence: "low",
      reasonCodes: ["MIXED_WORKING_LOADS"],
    };
    const screen = await render(
      <WorkoutSummaryScreen
        loadSummary={async () => summaryWithRecommendation(mixedRecommendation)}
        onDone={jest.fn()}
      />,
    );

    expect(await screen.findByText("MAINTAIN")).toBeOnTheScreen();
    expect(screen.getByText("3 × 6-8")).toBeOnTheScreen();
    expect(screen.getByText(
      "Your sets used different loads, so havAI is keeping the target broad for now.",
    )).toBeOnTheScreen();
    expect(screen.queryByText("8 / 8 / 7")).toBeNull();
  });

  it("explains insufficient data without inventing a load or rep target", async () => {
    const insufficientRecommendation: ProgressionRecommendation = {
      ...recommendation,
      recommendationType: "insufficient_data",
      recommendedWeightKg: undefined,
      targetSets: undefined,
      targetMinReps: undefined,
      targetMaxReps: undefined,
      targetSetReps: undefined,
      confidence: "low",
      reasonCodes: ["INSUFFICIENT_HISTORY"],
    };
    const screen = await render(
      <WorkoutSummaryScreen
        loadSummary={async () => summaryWithRecommendation(insufficientRecommendation)}
        onDone={jest.fn()}
      />,
    );

    expect(await screen.findByText("KEEP BUILDING HISTORY")).toBeOnTheScreen();
    expect(screen.getByText(
      "havAI needs more comparable sessions before recommending a progression change.",
    )).toBeOnTheScreen();
    expect(screen.queryByText("Bodyweight")).toBeNull();
    expect(screen.queryByText("No precise rep target yet")).toBeNull();
    expect(screen.queryByLabelText("Next target for Incline Bench")).toBeNull();
  });
});

function summaryWithRecommendation(
  nextRecommendation: ProgressionRecommendation,
): CompletedWorkoutSummary {
  return {
    ...result,
    summary: {
      ...result.summary,
      exerciseSummaries: result.summary.exerciseSummaries.map((summary) => (
        summary.exerciseId === "exercise-a" ? { ...summary, nextRecommendation } : summary
      )),
    },
    exercises: result.exercises.map((entry) => (
      entry.summary.exerciseId === "exercise-a"
        ? { ...entry, summary: { ...entry.summary, nextRecommendation } }
        : entry
    )),
  };
}
