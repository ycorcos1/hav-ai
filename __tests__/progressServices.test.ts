import { ExerciseHistoryService } from "@/features/progress/services/exerciseHistory";
import { calculateExerciseProgressMetrics } from "@/features/progress/services/progressMetrics";
import type { ExerciseHistoryRepository } from "@/db/repositories";
import type { ExerciseSessionPerformance } from "@/shared/contracts";

const sessions: ExerciseSessionPerformance[] = [{
  workoutId: "new",
  completedAt: "2026-09-03T10:00:00.000Z",
  sets: [{ weightKg: 90, reps: 5, rpe: 8 }],
}, {
  workoutId: "old",
  completedAt: "2026-09-01T10:00:00.000Z",
  sets: [{ weightKg: 80, reps: 8, rpe: 8.5 }, { weightKg: 100, reps: 1 }],
}];

describe("ExerciseHistoryService", () => {
  it("groups repository history into deterministic recent sessions and removes invalid sets", async () => {
    const repository: jest.Mocked<ExerciseHistoryRepository> = {
      getBestSet: jest.fn(),
      getCompletedSetsForExercises: jest.fn(),
      getRecentSessions: jest.fn().mockResolvedValue([
        sessions[1],
        { ...sessions[0], sets: [...sessions[0].sets, { reps: 0 }] },
      ]),
    };
    const result = await new ExerciseHistoryService(repository).getRecentSessions({
      userId: "user-a",
      exerciseId: "exercise-1",
      limit: 2,
    });
    expect(result.map(({ workoutId }) => workoutId)).toEqual(["new", "old"]);
    expect(result[0].sets).toEqual([{ weightKg: 90, reps: 5, rpe: 8 }]);
    expect(repository.getRecentSessions).toHaveBeenCalledWith({
      userId: "user-a",
      exerciseId: "exercise-1",
      limit: 2,
    });
  });
});

describe("calculateExerciseProgressMetrics", () => {
  it("calculates current/best e1RM, best load/set, recent change, and real trend points", () => {
    const result = calculateExerciseProgressMetrics(sessions);
    expect(result.currentEstimated1RMKg).toBeCloseTo(105);
    expect(result.bestEstimated1RMKg).toBeCloseTo(105);
    expect(result.bestWeightKg).toBe(100);
    expect(result.bestSet).toEqual({ weightKg: 90, reps: 5, rpe: 8 });
    expect(result.recentChangeKg).toBeCloseTo(3.67, 1);
    expect(result.lastPerformedAt).toBe("2026-09-03T10:00:00.000Z");
    expect(result.trend).toEqual([
      expect.objectContaining({ workoutId: "old" }),
      expect.objectContaining({ workoutId: "new" }),
    ]);
  });

  it("returns truthful insufficient data without inventing e1RM points", () => {
    expect(calculateExerciseProgressMetrics([{
      workoutId: "bodyweight",
      completedAt: "2026-09-03T10:00:00.000Z",
      sets: [{ reps: 12 }],
    }])).toEqual({
      bestSet: { reps: 12 },
      lastPerformedAt: "2026-09-03T10:00:00.000Z",
      trend: [],
    });
  });
});
