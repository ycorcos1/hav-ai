import { fireEvent, render, screen, userEvent } from "@testing-library/react-native";

import { NetworkStatusProvider } from "@/features/network/components/NetworkStatusProvider";
import type { NetworkStatusService } from "@/features/network/networkStatus";
import { ExerciseProgressScreen } from "@/features/progress/screens/ExerciseProgressScreen";
import type { ExerciseProgress } from "@/features/progress/services/progressApplication";

const progress: ExerciseProgress = {
  exercise: {
    id: "bench",
    name: "Bench Press",
    primaryMuscleGroup: "chest",
    secondaryMuscleGroups: ["triceps"],
    equipmentType: "barbell",
    measurementType: "weight_reps",
    isSystem: true,
    isArchived: false,
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
  },
  weightUnit: "kg",
  sessions: [{
    workoutId: "new",
    completedAt: "2026-09-03T10:00:00.000Z",
    sets: [{ weightKg: 90, reps: 5, rpe: 8 }],
  }, {
    workoutId: "old",
    completedAt: "2026-09-01T10:00:00.000Z",
    sets: [{ weightKg: 80, reps: 8 }],
  }],
  metrics: {
    currentEstimated1RMKg: 105,
    bestEstimated1RMKg: 105,
    bestWeightKg: 90,
    bestSet: { weightKg: 90, reps: 5, rpe: 8 },
    lastPerformedAt: "2026-09-03T10:00:00.000Z",
    recentChangeKg: 3.67,
    trend: [{ workoutId: "old", completedAt: "2026-09-01T10:00:00.000Z", estimated1RMKg: 101.33 }, {
      workoutId: "new", completedAt: "2026-09-03T10:00:00.000Z", estimated1RMKg: 105,
    }],
  },
};

const offline: NetworkStatusService = {
  getCurrentStatus: async () => "offline",
  subscribe: () => () => undefined,
};

describe("ExerciseProgressScreen", () => {
  it("shows core metrics and reveals only real trend points on request", async () => {
    const user = userEvent.setup();
    await render(
      <NetworkStatusProvider service={offline}>
        <ExerciseProgressScreen loadProgress={async () => progress} />
      </NetworkStatusProvider>,
    );
    expect(await screen.findByText("Bench Press")).toBeOnTheScreen();
    expect(screen.getByText("105 kg")).toBeOnTheScreen();
    expect(screen.getByText("90 kg × 5")).toBeOnTheScreen();
    expect(screen.queryByText("Estimated 1RM Over Time")).not.toBeOnTheScreen();
    expect(screen.getByText("Offline · Some historical data may be unavailable")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Show Graph" }));
    expect(screen.getByText("Estimated 1RM Over Time")).toBeOnTheScreen();
    expect(screen.getByText("Limited offline history")).toBeOnTheScreen();
    await fireEvent(screen.getByTestId("strength-trend-plot"), "layout", {
      nativeEvent: { layout: { width: 300, height: 160, x: 0, y: 0 } },
    });
    expect(screen.getByLabelText("101.3 kg estimated 1RM on 2026-09-01T10:00:00.000Z"))
      .toBeOnTheScreen();
    expect(screen.getByLabelText("105.0 kg estimated 1RM on 2026-09-03T10:00:00.000Z"))
      .toBeOnTheScreen();
    expect(screen.getAllByLabelText(/kg estimated 1RM on/)).toHaveLength(2);

    await user.press(screen.getByRole("button", { name: "Hide Graph" }));
    expect(screen.queryByText("Estimated 1RM Over Time")).not.toBeOnTheScreen();
  });

  it("handles insufficient history without fake graph or percentages", async () => {
    await render(
      <ExerciseProgressScreen loadProgress={async () => ({
        ...progress,
        sessions: [],
        metrics: { trend: [] },
      })} />,
    );
    expect(await screen.findByText("Train this exercise a few more times to build a meaningful trend."))
      .toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Show Graph" })).not.toBeOnTheScreen();
    expect(screen.getAllByText("Not enough data").length).toBeGreaterThan(0);
  });
});
