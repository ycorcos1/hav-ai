import {
  calculateSessionDelta,
  calculateTotalReps,
  calculateWorkingSetCount,
} from "@/features/metrics";

describe("canonical workout metrics", () => {
  const sets = [
    { reps: 12, setType: "warmup" as const },
    { reps: 8, setType: "working" as const },
    { reps: 7, setType: "working" as const },
    { reps: 6, setType: "working" as const },
  ];

  it("calculates working-set totals and excludes warm-ups", () => {
    expect(calculateTotalReps(sets)).toBe(21);
    expect(calculateWorkingSetCount(sets)).toBe(3);
  });

  it("calculates deterministic current-minus-previous rep deltas", () => {
    expect(calculateSessionDelta(sets, [
      { reps: 8 },
      { reps: 6 },
      { reps: 6 },
    ])).toEqual({
      currentTotalReps: 21,
      previousTotalReps: 20,
      repDelta: 1,
    });
    expect(calculateSessionDelta([], [])).toEqual({
      currentTotalReps: 0,
      previousTotalReps: 0,
      repDelta: 0,
    });
  });
});
