import {
  calculateEpleyOneRepMax,
  epleyFormulaVersion,
  maximumReliableEpleyReps,
} from "@/features/metrics";
import { canonicalWeightKg } from "@/features/workouts/services/weightConversion";

describe("canonical Epley e1RM", () => {
  it("uses exact load for one rep and Epley for multiple reps in kilograms", () => {
    expect(calculateEpleyOneRepMax(100, 1)).toEqual({
      estimated1RMKg: 100,
      sourceWeightKg: 100,
      reps: 1,
      formulaVersion: epleyFormulaVersion,
    });
    expect(calculateEpleyOneRepMax(83.5, 8)).toEqual({
      estimated1RMKg: 83.5 * (1 + 8 / 30),
      sourceWeightKg: 83.5,
      reps: 8,
      formulaVersion: "epley-v1",
    });
  });

  it("applies the centralized high-rep cutoff", () => {
    expect(calculateEpleyOneRepMax(60, maximumReliableEpleyReps)).not.toBeNull();
    expect(calculateEpleyOneRepMax(60, maximumReliableEpleyReps + 1)).toBeNull();
  });

  it("rejects invalid inputs and supports canonical conversion before calculation", () => {
    expect(calculateEpleyOneRepMax(0, 8)).toBeNull();
    expect(calculateEpleyOneRepMax(-1, 8)).toBeNull();
    expect(calculateEpleyOneRepMax(80, 0)).toBeNull();
    expect(calculateEpleyOneRepMax(80, 7.5)).toBeNull();
    expect(calculateEpleyOneRepMax(Number.NaN, 8)).toBeNull();

    const weightKg = canonicalWeightKg(185, "lb");
    expect(calculateEpleyOneRepMax(weightKg, 8)?.estimated1RMKg)
      .toBeCloseTo(weightKg * (1 + 8 / 30), 12);
  });
});
