import { act, fireEvent, render } from "@testing-library/react-native";

import { NetworkStatusProvider } from "@/features/network/components/NetworkStatusProvider";
import type { NetworkStatusService } from "@/features/network/networkStatus";
import { RecommendationCard } from "@/features/recommendations/components/RecommendationCard";
import type { ProgressionRecommendation, RecommendationExplanationV1 } from "@/shared/contracts";

const timestamp = "2026-09-22T12:00:00.000Z";
const recommendation: ProgressionRecommendation = {
  id: "recommendation-a",
  userId: "user-a",
  exerciseId: "exercise-a",
  recommendationType: "increase_weight",
  recommendedWeightKg: 86.1825503,
  targetSets: 3,
  targetMinReps: 6,
  targetMaxReps: 8,
  targetSetReps: [6, 6, 6],
  confidence: "high",
  reasonCodes: ["TOP_OF_REP_RANGE_REACHED", "RPE_ACCEPTABLE"],
  status: "active",
  engineVersion: "progression-v1",
  createdAt: timestamp,
  updatedAt: timestamp,
};

const onlineService: NetworkStatusService = {
  getCurrentStatus: async () => "online",
  subscribe: () => () => {},
};

const offlineService: NetworkStatusService = {
  getCurrentStatus: async () => "offline",
  subscribe: () => () => {},
};

function deferred<Value>(): {
  promise: Promise<Value>;
  resolve: (value: Value) => void;
} {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve };
}

describe("RecommendationCard", () => {
  it("renders increase, maintain, and insufficient-data states truthfully", async () => {
    const screen = await render(
      <RecommendationCard
        exerciseName="Bench Press"
        recommendation={recommendation}
        weightUnit="lb"
      />,
    );

    expect(screen.getByText("LOAD UP")).toBeOnTheScreen();
    expect(screen.getByText("190 lb")).toBeOnTheScreen();
    expect(screen.getByText("6 / 6 / 6")).toBeOnTheScreen();

    await screen.rerender(
      <RecommendationCard
        exerciseName="Bench Press"
        recommendation={{
          ...recommendation,
          recommendationType: "maintain_weight",
          reasonCodes: ["MIXED_WORKING_LOADS"],
          targetSetReps: undefined,
        }}
        weightUnit="lb"
      />,
    );
    expect(screen.getByText("MAINTAIN")).toBeOnTheScreen();
    expect(screen.getByText("3 × 6-8")).toBeOnTheScreen();
    expect(screen.getByText(/different loads/)).toBeOnTheScreen();

    await screen.rerender(
      <RecommendationCard
        exerciseName="Bench Press"
        recommendation={{
          ...recommendation,
          recommendationType: "insufficient_data",
          recommendedWeightKg: undefined,
          targetSets: undefined,
          targetMinReps: undefined,
          targetMaxReps: undefined,
          targetSetReps: undefined,
          reasonCodes: ["INSUFFICIENT_HISTORY"],
        }}
        weightUnit="lb"
      />,
    );
    expect(screen.getByText("KEEP BUILDING HISTORY")).toBeOnTheScreen();
    expect(screen.queryByText("Bodyweight")).toBeNull();
  });

  it("shows AI loading and success without replacing the deterministic target", async () => {
    const pending = deferred<RecommendationExplanationV1>();
    const loadAIExplanation = jest.fn(() => pending.promise);
    const screen = await render(
      <NetworkStatusProvider service={onlineService}>
        <RecommendationCard
          exerciseName="Bench Press"
          loadAIExplanation={loadAIExplanation}
          recommendation={recommendation}
          weightUnit="lb"
        />
      </NetworkStatusProvider>,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Why?" }));
    expect(screen.getByLabelText("AI explanation loading")).toBeOnTheScreen();
    expect(screen.getByText("190 lb")).toBeOnTheScreen();
    expect(loadAIExplanation).toHaveBeenCalledWith(recommendation.id);

    await act(async () => {
      pending.resolve({
        headline: "A measured increase",
        summary: "The deterministic target reflects your completed rep range.",
        evidence: ["You reached the top of the target range."],
        meta: { promptVersion: "explanation-v1" },
      });
      await pending.promise;
    });

    expect(screen.getByLabelText("AI recommendation explanation")).toBeOnTheScreen();
    expect(screen.getByText("A measured increase")).toBeOnTheScreen();
    expect(screen.getByText("190 lb")).toBeOnTheScreen();
    expect(screen.queryByLabelText("AI explanation loading")).toBeNull();
  });

  it("keeps the core recommendation visible after a sanitized AI failure", async () => {
    const screen = await render(
      <NetworkStatusProvider service={onlineService}>
        <RecommendationCard
          exerciseName="Bench Press"
          loadAIExplanation={jest.fn().mockRejectedValue(new Error("provider detail"))}
          recommendation={recommendation}
          weightUnit="lb"
        />
      </NetworkStatusProvider>,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Why?" }));
    expect(await screen.findByText(/Couldn't generate the richer explanation/)).toBeOnTheScreen();
    expect(screen.getByText("190 lb")).toBeOnTheScreen();
    expect(screen.queryByText("provider detail")).toBeNull();
    expect(screen.getByRole("button", { name: "Retry AI Explanation" })).toBeOnTheScreen();
  });

  it("uses cached deterministic reasons offline without calling AI", async () => {
    const loadAIExplanation = jest.fn();
    const screen = await render(
      <NetworkStatusProvider service={offlineService}>
        <RecommendationCard
          exerciseName="Bench Press"
          loadAIExplanation={loadAIExplanation}
          recommendation={recommendation}
          weightUnit="lb"
        />
      </NetworkStatusProvider>,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Why?" }));
    expect(screen.getByText("Increase the load")).toBeOnTheScreen();
    expect(screen.getByText("AI explanation requires an internet connection.")).toBeOnTheScreen();
    expect(screen.getByText("190 lb")).toBeOnTheScreen();
    expect(loadAIExplanation).not.toHaveBeenCalled();
  });
});
