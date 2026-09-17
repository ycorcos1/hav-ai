import {
  analyzeExerciseTrend,
  detectPlateau,
  generateRepTarget,
  selectWeightIncrement,
} from "@/features/progression";
import type { ExerciseSessionPerformance } from "@/shared/contracts";

const session = (
  completedAt: string,
  reps: number[],
  rpe?: 7 | 8 | 9,
): ExerciseSessionPerformance => ({
  workoutId: completedAt,
  completedAt,
  sets: reps.map((value) => ({ reps: value, weightKg: 100, rpe })),
});

describe("progression trends and plateaus", () => {
  it("requires enough history and normalizes chronological ordering", () => {
    expect(analyzeExerciseTrend([session("2026-01-02", [7, 6, 6])])).toEqual({
      direction: "insufficient_data",
      sessionsAnalyzed: 1,
      plateau: "none",
    });
    expect(
      analyzeExerciseTrend([
        session("2026-01-03", [8, 7, 7]),
        session("2026-01-01", [6, 6, 6]),
        session("2026-01-02", [7, 6, 6]),
      ]).direction,
    ).toBe("improving");
  });

  it("detects flat and declining trends with deterministic plateau thresholds", () => {
    expect(
      analyzeExerciseTrend([
        session("2026-01-01", [7, 7, 7]),
        session("2026-01-02", [7, 7, 7]),
        session("2026-01-03", [7, 7, 7]),
      ]),
    ).toMatchObject({ direction: "flat", plateau: "possible" });
    expect(
      analyzeExerciseTrend([
        session("2026-01-01", [8, 8, 8]),
        session("2026-01-02", [7, 7, 7]),
        session("2026-01-03", [6, 6, 6]),
      ]).direction,
    ).toBe("declining");
    expect(
      detectPlateau({
        comparableSessionCount: 4,
        trendDirection: "flat",
        hasMeaningfulRepImprovement: false,
        hasMeaningfulEstimatedOneRepMaxImprovement: false,
        hasMeaningfulRpeImprovement: false,
      }),
    ).toBe("likely");
  });
});

describe("progression target selection", () => {
  it.each([
    [[8, 7, 6], [8, 7, 7]],
    [[7, 7, 7], [8, 7, 7]],
    [[8, 8, 7], [8, 8, 8]],
  ])("advances %j by one fatigue-ordered rep", (achievedReps, expected) => {
    expect(generateRepTarget({ achievedReps, targetSets: 3, minReps: 6, maxReps: 8 })).toEqual(
      expected,
    );
  });

  it("returns no rep progression after the complete range is maxed", () => {
    expect(
      generateRepTarget({ achievedReps: [8, 8, 8], targetSets: 3, minReps: 6, maxReps: 8 }),
    ).toBeNull();
  });

  it("selects practical increments, guardrails large jumps, and prefers prior success", () => {
    expect(
      selectWeightIncrement({ currentWeightKg: 100, equipmentType: "barbell", direction: "increase" }),
    ).toMatchObject({ recommendedWeightKg: 102.26796185, guardrailExceeded: false });
    expect(
      selectWeightIncrement({
        currentWeightKg: 20,
        equipmentType: "machine",
        direction: "increase",
        availableWeightIncrementKg: 5,
      }),
    ).toMatchObject({ recommendedWeightKg: null, guardrailExceeded: true });
    expect(
      selectWeightIncrement({
        currentWeightKg: 90,
        equipmentType: "barbell",
        direction: "decrease",
        previousSuccessfulWeightKg: 85,
      }),
    ).toMatchObject({ recommendedWeightKg: 85, usedPreviousSuccessfulLoad: true });
  });
});
