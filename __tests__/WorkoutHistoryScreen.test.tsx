import { render, screen, userEvent } from "@testing-library/react-native";

import { NetworkStatusProvider } from "@/features/network/components/NetworkStatusProvider";
import type { NetworkStatusService } from "@/features/network/networkStatus";
import { WorkoutHistoryScreen } from "@/features/workouts/screens/WorkoutHistoryScreen";
import type { Workout } from "@/shared/contracts";

const first: Workout = {
  id: "workout-new",
  userId: "user-a",
  name: "Upper Body",
  status: "completed",
  startedAt: "2026-09-03T10:00:00.000Z",
  completedAt: "2026-09-03T11:05:00.000Z",
  exercises: [{
    id: "workout-exercise-1",
    userId: "user-a",
    workoutId: "workout-new",
    exerciseId: "exercise-1",
    position: 0,
    sets: [],
    createdAt: "2026-09-03T10:00:00.000Z",
    updatedAt: "2026-09-03T11:05:00.000Z",
  }],
  createdAt: "2026-09-03T10:00:00.000Z",
  updatedAt: "2026-09-03T11:05:00.000Z",
};

function network(status: "online" | "offline" | "unknown"): NetworkStatusService {
  return { getCurrentStatus: async () => status, subscribe: () => () => undefined };
}

describe("WorkoutHistoryScreen", () => {
  it("shows completed workout metadata, opens detail, and paginates", async () => {
    const user = userEvent.setup();
    const loadPage = jest.fn()
      .mockResolvedValueOnce({ items: [first], nextCursor: { completedAt: first.completedAt, id: first.id } })
      .mockResolvedValueOnce({ items: [{ ...first, id: "workout-old", name: "Lower Body" }] });
    const onOpenWorkout = jest.fn();
    await render(
      <NetworkStatusProvider service={network("online")}>
        <WorkoutHistoryScreen loadPage={loadPage} onOpenWorkout={onOpenWorkout} />
      </NetworkStatusProvider>,
    );

    expect(await screen.findByText("Upper Body")).toBeOnTheScreen();
    expect(screen.getByText("Sep 3, 2026")).toBeOnTheScreen();
    expect(screen.getByText("1h 5m · 1 exercise")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "View Workout" }));
    expect(onOpenWorkout).toHaveBeenCalledWith("workout-new");
    await user.press(screen.getByRole("button", { name: "Load More" }));
    expect(await screen.findByText("Lower Body")).toBeOnTheScreen();
    expect(loadPage).toHaveBeenLastCalledWith({ completedAt: first.completedAt, id: first.id });
  });

  it("shows the canonical empty and offline advisory states", async () => {
    await render(
      <NetworkStatusProvider service={network("offline")}>
        <WorkoutHistoryScreen loadPage={async () => ({ items: [] })} onOpenWorkout={jest.fn()} />
      </NetworkStatusProvider>,
    );
    expect(await screen.findByText("No completed workouts yet")).toBeOnTheScreen();
    expect(screen.getByText("Finish your first workout to start building history.")).toBeOnTheScreen();
    expect(screen.getByText("Offline · Some historical data may be unavailable")).toBeOnTheScreen();
  });
});
