import { calculateProgression } from "@/features/progression";
import type { ExerciseSessionPerformance, ProgressionInput } from "@/shared/contracts";

const kg185 = 83.9146;
const kg190 = 86.18256;

function session(
  day: number,
  reps: number[],
  weightKg = kg185,
  rpe?: 8 | 9.5,
): ExerciseSessionPerformance {
  return {
    workoutId: `workout-${day}`,
    completedAt: `2026-02-${String(day).padStart(2, "0")}T10:00:00.000Z`,
    sets: reps.map((value) => ({ reps: value, weightKg, rpe })),
  };
}

function weightedInput(
  reps: number[],
  overrides: Partial<ProgressionInput> = {},
): ProgressionInput {
  return {
    exercise: { exerciseId: "bench", measurementType: "weight_reps", equipmentType: "barbell" },
    currentTarget: { targetSets: 3, minReps: 6, maxReps: 8, targetWeightKg: kg185 },
    currentSession: session(10, reps),
    recentSessions: [],
    preferences: { primaryGoal: "hybrid", progressionStyle: "balanced" },
    availableWeightIncrementKg: 2.26796,
    ...overrides,
  };
}

describe("golden progression behavior", () => {
  it.each([
    [[6, 6, 6], [7, 6, 6]],
    [[7, 6, 6], [7, 7, 6]],
    [[7, 7, 6], [7, 7, 7]],
    [[7, 7, 7], [8, 7, 7]],
    [[8, 7, 7], [8, 8, 7]],
    [[8, 8, 7], [8, 8, 8]],
  ])("advances weighted reps minimally from %j", (reps, expected) => {
    expect(calculateProgression(weightedInput(reps))).toMatchObject({
      recommendationType: "increase_reps",
      recommendedWeightKg: kg185,
      targetSetReps: expected,
    });
  });

  it("moves a maxed weighted range to the next practical load", () => {
    expect(calculateProgression(weightedInput([8, 8, 8]))).toMatchObject({
      recommendationType: "increase_weight",
      recommendedWeightKg: kg190,
      targetSetReps: [6, 6, 6],
    });
  });

  it("distinguishes balanced, conservative, and aggressive decisions", () => {
    const history = [session(7, [7, 7, 7], kg185, 8), session(8, [8, 7, 7], kg185, 8)];
    const strong = weightedInput([8, 8, 7], {
      currentSession: session(9, [8, 8, 7], kg185, 8),
      recentSessions: history,
    });
    expect(calculateProgression(strong).recommendationType).toBe("increase_reps");
    expect(
      calculateProgression({
        ...strong,
        preferences: { ...strong.preferences, progressionStyle: "aggressive" },
      }).recommendationType,
    ).toBe("increase_weight");
    expect(
      calculateProgression(
        weightedInput([8, 8, 8], {
          currentSession: session(9, [8, 8, 8], kg185, 9.5),
          preferences: { primaryGoal: "hybrid", progressionStyle: "conservative" },
        }),
      ).recommendationType,
    ).toBe("repeat_target");
  });

  it("works without RPE and uses high RPE only as a style modifier", () => {
    expect(calculateProgression(weightedInput([8, 8, 8])).reasonCodes).toContain("RPE_UNAVAILABLE");
    expect(
      calculateProgression(
        weightedInput([8, 8, 8], { currentSession: session(10, [8, 8, 8], kg185, 9.5) }),
      ).recommendationType,
    ).toBe("increase_weight");
  });

  it("surfaces plateau evidence without inventing an automatic deload", () => {
    const result = calculateProgression(
      weightedInput([7, 7, 7], {
        currentSession: session(10, [7, 7, 7]),
        recentSessions: [
          session(7, [7, 7, 7]),
          session(8, [7, 7, 7]),
          session(9, [7, 7, 7]),
        ],
      }),
    );
    expect(result.recommendationType).toBe("increase_reps");
    expect(result.reasonCodes).toEqual(
      expect.arrayContaining(["PERFORMANCE_REPEATED", "MULTI_SESSION_STALL", "PLATEAU_DETECTED"]),
    );
  });

  it("repeats after one failed load attempt and decreases after repeated failure", () => {
    expect(
      calculateProgression(
        weightedInput([5, 5, 4], {
          currentTarget: { targetSets: 3, minReps: 6, maxReps: 8, targetWeightKg: kg190 },
          currentSession: session(10, [5, 5, 4], kg190),
          recentSessions: [session(9, [8, 8, 8], kg185)],
        }),
      ).recommendationType,
    ).toBe("repeat_target");
    expect(
      calculateProgression(
        weightedInput([5, 5, 5], {
          currentTarget: { targetSets: 3, minReps: 6, maxReps: 8, targetWeightKg: kg190 },
          currentSession: session(11, [5, 5, 5], kg190),
          recentSessions: [session(9, [8, 8, 8], kg185), session(10, [5, 5, 4], kg190)],
        }),
      ),
    ).toMatchObject({ recommendationType: "decrease_weight", recommendedWeightKg: kg185 });
  });

  it("handles mixed loads, extra sets, and missing sets explicitly", () => {
    const mixed = weightedInput([6, 8, 7], {
      currentSession: {
        ...session(10, [6, 8, 7]),
        sets: [
          { reps: 6, weightKg: kg190 },
          { reps: 8, weightKg: kg185 },
          { reps: 7, weightKg: kg185 },
        ],
      },
    });
    expect(calculateProgression(mixed)).toMatchObject({
      recommendationType: "maintain_weight",
      reasonCodes: expect.arrayContaining(["MIXED_WORKING_LOADS"]),
    });
    expect(calculateProgression(weightedInput([7, 7, 7, 6])).reasonCodes).toContain(
      "EXTRA_SETS_PERFORMED",
    );
    expect(calculateProgression(weightedInput([7, 7])).reasonCodes).toContain(
      "INCOMPLETE_TARGET_SETS",
    );
  });

  it("progresses bodyweight reps and locks the max without inventing load", () => {
    const bodyweight = (reps: number[]): ProgressionInput => ({
      ...weightedInput(reps),
      exercise: {
        exerciseId: "pull-up",
        measurementType: "bodyweight_reps",
        equipmentType: "bodyweight",
      },
      currentTarget: { targetSets: 3, minReps: 8, maxReps: 12 },
      currentSession: {
        ...session(10, reps),
        sets: reps.map((value) => ({ reps: value })),
      },
    });
    expect(calculateProgression(bodyweight([10, 9, 8]))).toMatchObject({
      recommendationType: "increase_reps",
      targetSetReps: [10, 9, 9],
    });
    const maxed = calculateProgression(bodyweight([12, 12, 12]));
    expect(maxed.recommendationType).toBe("repeat_target");
    expect(maxed.recommendedWeightKg).toBeUndefined();
    expect(maxed.reasonCodes).toContain("REP_RANGE_MAXED");
  });
});
