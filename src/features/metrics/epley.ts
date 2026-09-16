import type { EstimatedOneRepMaxResult } from "@/shared/contracts";

export const epleyFormulaVersion = "epley-v1";
export const maximumReliableEpleyReps = 15;

export function calculateEpleyOneRepMax(
  weightKg: number,
  reps: number,
): EstimatedOneRepMaxResult | null {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null;
  if (!Number.isInteger(reps) || reps <= 0 || reps > maximumReliableEpleyReps) return null;
  return {
    estimated1RMKg: reps === 1 ? weightKg : weightKg * (1 + reps / 30),
    sourceWeightKg: weightKg,
    reps,
    formulaVersion: epleyFormulaVersion,
  };
}
