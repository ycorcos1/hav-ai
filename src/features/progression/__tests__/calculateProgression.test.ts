import { calculateProgression, progressionEngineVersion } from "@/features/progression";
import type { ExerciseSessionPerformance, ProgressionInput } from "@/shared/contracts";

const performance = (
  day: number,
  reps: number[],
  weightKg = 80,
  rpe?: 8 | 9.5,
): ExerciseSessionPerformance => ({
  workoutId: `workout-${day}`,
  completedAt: `2026-01-${String(day).padStart(2, "0")}T12:00:00.000Z`,
  sets: reps.map((value) => ({ reps: value, weightKg, rpe })),
});

const input = (overrides: Partial<ProgressionInput> = {}): ProgressionInput => ({
  exercise: {
    exerciseId: "exercise-1",
    measurementType: "weight_reps",
    equipmentType: "barbell",
  },
  currentTarget: {
    targetSets: 3,
    minReps: 6,
    maxReps: 8,
    targetWeightKg: 80,
  },
  currentSession: performance(3, [8, 7, 6]),
  recentSessions: [],
  preferences: { primaryGoal: "hybrid", progressionStyle: "balanced" },
  availableWeightIncrementKg: 2.5,
  ...overrides,
});

describe("calculateProgression", () => {
  it("produces deterministic explicit same-load rep progression", () => {
    const value = input();
    const first = calculateProgression(value);
    expect(first).toMatchObject({
      recommendationType: "increase_reps",
      recommendedWeightKg: 80,
      targetSetReps: [8, 7, 7],
      confidence: "low",
      engineVersion: progressionEngineVersion,
    });
    expect(first.reasonCodes).toEqual([
      "INITIAL_BASELINE_ESTABLISHED",
      "WITHIN_TARGET_RANGE",
      "RPE_UNAVAILABLE",
    ]);
    expect(calculateProgression(value)).toEqual(first);
  });

  it("increases weighted load and resets explicit reps after a perfect session", () => {
    expect(calculateProgression(input({ currentSession: performance(3, [8, 8, 8]) }))).toMatchObject({
      recommendationType: "increase_weight",
      recommendedWeightKg: 82.5,
      targetSetReps: [6, 6, 6],
      reasonCodes: expect.arrayContaining(["TOP_OF_REP_RANGE_REACHED"]),
    });
  });

  it("keeps bodyweight progression rep-only and locks a maxed range", () => {
    const result = calculateProgression(
      input({
        exercise: {
          exerciseId: "pull-up",
          measurementType: "bodyweight_reps",
          equipmentType: "bodyweight",
        },
        currentTarget: { targetSets: 3, minReps: 8, maxReps: 12 },
        currentSession: {
          ...performance(3, [12, 12, 12]),
          sets: [{ reps: 12 }, { reps: 12 }, { reps: 12 }],
        },
      }),
    );
    expect(result).toMatchObject({
      recommendationType: "repeat_target",
      targetSetReps: [12, 12, 12],
      reasonCodes: expect.arrayContaining(["REP_RANGE_MAXED"]),
    });
  });

  it("progresses reps-only exercises without inventing a load", () => {
    const result = calculateProgression(
      input({
        exercise: {
          exerciseId: "plank-reach",
          measurementType: "reps_only",
          equipmentType: "bodyweight",
        },
        currentTarget: { targetSets: 3, minReps: 8, maxReps: 12 },
        currentSession: {
          ...performance(3, [10, 9, 8]),
          sets: [{ reps: 10 }, { reps: 9 }, { reps: 8 }],
        },
      }),
    );

    expect(result).toMatchObject({
      recommendationType: "increase_reps",
      targetSetReps: [10, 9, 9],
    });
    expect(result.recommendedWeightKg).toBeUndefined();
  });

  it("keeps partial RPE evidence optional and reports meaningful RPE change", () => {
    const partialRpe = calculateProgression(
      input({
        currentSession: {
          ...performance(4, [8, 7, 6]),
          sets: [
            { reps: 8, weightKg: 80, rpe: 8 },
            { reps: 7, weightKg: 80 },
            { reps: 6, weightKg: 80, rpe: 9 },
          ],
        },
      }),
    );
    expect(partialRpe.reasonCodes).toContain("RPE_ACCEPTABLE");
    expect(partialRpe.recommendationType).not.toBe("insufficient_data");

    const improved = calculateProgression(
      input({
        currentSession: performance(4, [8, 8, 8], 80, 8),
        recentSessions: [
          performance(2, [8, 8, 8], 80, 9.5),
          performance(3, [8, 8, 8], 80, 9.5),
        ],
      }),
    );
    expect(improved.reasonCodes).toContain("RPE_IMPROVED");

    const worsened = calculateProgression(
      input({
        currentSession: performance(4, [8, 8, 8], 80, 9.5),
        recentSessions: [performance(2, [8, 8, 8], 80, 8), performance(3, [8, 8, 8], 80, 8)],
      }),
    );
    expect(worsened.reasonCodes).toContain("RPE_WORSENED");
  });

  it("distinguishes a first-session baseline from a second-session recommendation", () => {
    const first = calculateProgression(input());
    expect(first.confidence).toBe("low");
    expect(first.reasonCodes).toContain("INITIAL_BASELINE_ESTABLISHED");

    const second = calculateProgression(
      input({ recentSessions: [performance(2, [7, 7, 6])] }),
    );
    expect(second.confidence).toBe("medium");
    expect(second.reasonCodes).not.toContain("INITIAL_BASELINE_ESTABLISHED");
  });

  it("tolerates one poor session and decreases only after repeated underperformance", () => {
    expect(calculateProgression(input({ currentSession: performance(3, [5, 5, 4], 85) }))).toMatchObject({
      recommendationType: "repeat_target",
      reasonCodes: expect.arrayContaining(["SINGLE_SESSION_UNDERPERFORMANCE"]),
    });
    expect(
      calculateProgression(
        input({
          currentTarget: { targetSets: 3, minReps: 6, maxReps: 8, targetWeightKg: 85 },
          currentSession: performance(4, [5, 5, 5], 85),
          recentSessions: [performance(2, [8, 8, 8], 80), performance(3, [5, 5, 4], 85)],
        }),
      ),
    ).toMatchObject({
      recommendationType: "decrease_weight",
      recommendedWeightKg: 80,
      reasonCodes: expect.arrayContaining(["REPEATED_FAILED_PROGRESSION"]),
    });
  });

  it("uses maintain_weight for mixed loads without pretending to set precise reps", () => {
    const result = calculateProgression(
      input({
        currentSession: {
          ...performance(3, [6, 8, 7]),
          sets: [
            { reps: 6, weightKg: 85 },
            { reps: 8, weightKg: 80 },
            { reps: 7, weightKg: 80 },
          ],
        },
      }),
    );
    expect(result.recommendationType).toBe("maintain_weight");
    expect(result.targetSetReps).toBeUndefined();
    expect(result.reasonCodes).toContain("MIXED_WORKING_LOADS");
  });

  it("applies conservative high-effort and aggressive strong-trend modifiers", () => {
    expect(
      calculateProgression(
        input({
          currentSession: performance(4, [8, 8, 8], 80, 9.5),
          preferences: { primaryGoal: "hybrid", progressionStyle: "conservative" },
        }),
      ).recommendationType,
    ).toBe("repeat_target");

    expect(
      calculateProgression(
        input({
          currentSession: performance(4, [8, 8, 7], 80, 8),
          recentSessions: [performance(2, [7, 7, 7], 80, 8), performance(3, [8, 7, 7], 80, 8)],
          preferences: { primaryGoal: "strength", progressionStyle: "aggressive" },
        }),
      ).recommendationType,
    ).toBe("increase_weight");
  });

  it("fails safely for malformed or unusable input", () => {
    const insufficient = {
      recommendationType: "insufficient_data",
      confidence: "low",
      reasonCodes: ["INSUFFICIENT_HISTORY"],
      engineVersion: progressionEngineVersion,
    } as const;

    expect(
      calculateProgression(input({ currentTarget: { targetSets: 0, minReps: 8, maxReps: 6 } })),
    ).toEqual(insufficient);
    expect(
      calculateProgression(
        input({
          currentSession: {
            ...performance(3, [8, 7, 6]),
            sets: [{ reps: 8, weightKg: 80, rpe: 10.5 as 10 }],
          },
        }),
      ),
    ).toEqual(insufficient);
    expect(
      calculateProgression(
        input({
          currentSession: {
            ...performance(3, [8, 7, 6]),
            sets: [{ reps: 8, weightKg: 80, rpe: 5.5 as 6 }],
          },
        }),
      ),
    ).toEqual(insufficient);
    expect(
      calculateProgression(
        input({
          recentSessions: [{
            ...performance(2, [8, 7, 6]),
            sets: [{ reps: 8, weightKg: 80, rpe: 8.25 as 8 }],
          }],
        }),
      ),
    ).toEqual(insufficient);
  });
});
