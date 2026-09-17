import {
  calculateEstimatedOneRepMaxTrendMetrics,
  calculateRepMetrics,
  calculateRpeMetrics,
  classifyMeaningfulRpeChange,
  classifySession,
} from "@/features/progression";

describe("progression session classification", () => {
  const target = { targetSets: 3, minReps: 6, maxReps: 8 };

  it.each([
    [[8, 8, 8], "perfect"],
    [[8, 7, 6], "successful"],
    [[6, 6, 5], "partial_underperformance"],
    [[4, 4, 4], "severe_underperformance"],
  ] as const)("classifies %j as %s", (reps, expected) => {
    expect(classifySession({ ...target, sets: reps.map((value) => ({ reps: value })) })).toBe(
      expected,
    );
  });

  it("uses explicit targets and treats mixed working loads as irregular", () => {
    expect(
      classifySession({
        ...target,
        targetSetReps: [8, 7, 6],
        sets: [{ reps: 8 }, { reps: 7 }, { reps: 6 }],
      }),
    ).toBe("perfect");
    expect(
      classifySession({
        ...target,
        sets: [{ reps: 6, weightKg: 80 }, { reps: 8, weightKg: 75 }, { reps: 7, weightKg: 75 }],
      }),
    ).toBe("irregular");
  });
});

describe("progression metrics", () => {
  it("calculates deterministic rep metrics", () => {
    expect(calculateRepMetrics([{ reps: 8 }, { reps: 7 }, { reps: 6 }])).toEqual({
      totalReps: 21,
      averageReps: 7,
      bestSetReps: 8,
      workingSetCount: 3,
    });
    expect(calculateRepMetrics([])).toEqual({
      totalReps: 0,
      averageReps: null,
      bestSetReps: null,
      workingSetCount: 0,
    });
  });

  it("calculates optional RPE coverage, average, and meaningful change", () => {
    expect(calculateRpeMetrics([{ reps: 8, rpe: 8 }, { reps: 7 }, { reps: 6, rpe: 9 }])).toEqual({
      coverage: 2 / 3,
      averageRpe: 8.5,
      setsWithRpe: 2,
      workingSetCount: 3,
    });
    expect(classifyMeaningfulRpeChange(8, 9)).toBe("improved");
    expect(classifyMeaningfulRpeChange(9, 8)).toBe("worsened");
    expect(classifyMeaningfulRpeChange(8, 8.5)).toBe("unchanged");
    expect(classifyMeaningfulRpeChange(null, 8)).toBe("unavailable");
  });

  it("reuses canonical bounded Epley estimates for meaningful trend metrics", () => {
    const metrics = calculateEstimatedOneRepMaxTrendMetrics(
      [{ weightKg: 100, reps: 8 }],
      [{ weightKg: 100, reps: 6 }],
    );
    expect(metrics.currentBestEstimated1RMKg).toBeCloseTo(126.67, 2);
    expect(metrics.previousBestEstimated1RMKg).toBe(120);
    expect(metrics.changePct).toBeCloseTo(5.56, 2);
    expect(metrics.meaningfulChange).toBe("improved");

    expect(
      calculateEstimatedOneRepMaxTrendMetrics([{ weightKg: 100, reps: 16 }], []).meaningfulChange,
    ).toBe("unavailable");
  });
});
