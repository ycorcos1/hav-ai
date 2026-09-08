import type { WeightKg, WeightUnit } from "@/shared/contracts";

const kilogramsPerPound = 0.45359237;

export function displayWeightFromKg(weightKg: WeightKg, unit: WeightUnit): number {
  return unit === "kg" ? weightKg : weightKg / kilogramsPerPound;
}

export function canonicalWeightKg(displayWeight: number, unit: WeightUnit): WeightKg {
  return unit === "kg" ? displayWeight : displayWeight * kilogramsPerPound;
}

export function formatDisplayWeight(weightKg: WeightKg, unit: WeightUnit): string {
  const displayWeight = displayWeightFromKg(weightKg, unit);
  return Number(displayWeight.toFixed(2)).toString();
}
