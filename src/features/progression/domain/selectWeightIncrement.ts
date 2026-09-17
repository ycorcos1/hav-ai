import {
  getDefaultWeightIncrementKg,
  progressionConfig,
} from "@/features/progression/config";
import type { WeightIncrementSelection } from "@/features/progression/types";
import type { EquipmentType } from "@/shared/contracts";

export type SelectWeightIncrementInput = {
  currentWeightKg: number;
  equipmentType: EquipmentType;
  direction: "increase" | "decrease";
  availableWeightIncrementKg?: number;
  previousSuccessfulWeightKg?: number;
};

export function selectWeightIncrement({
  currentWeightKg,
  equipmentType,
  direction,
  availableWeightIncrementKg,
  previousSuccessfulWeightKg,
}: SelectWeightIncrementInput): WeightIncrementSelection {
  const incrementKg = availableWeightIncrementKg ?? getDefaultWeightIncrementKg(equipmentType);
  if (currentWeightKg <= 0 || incrementKg === undefined || incrementKg <= 0) {
    return {
      recommendedWeightKg: null,
      incrementKg: incrementKg ?? null,
      guardrailExceeded: false,
      usedPreviousSuccessfulLoad: false,
    };
  }

  if (
    direction === "decrease" &&
    previousSuccessfulWeightKg !== undefined &&
    previousSuccessfulWeightKg > 0 &&
    previousSuccessfulWeightKg < currentWeightKg
  ) {
    return {
      recommendedWeightKg: previousSuccessfulWeightKg,
      incrementKg: currentWeightKg - previousSuccessfulWeightKg,
      guardrailExceeded: false,
      usedPreviousSuccessfulLoad: true,
    };
  }

  const guardrailExceeded =
    direction === "increase" &&
    (incrementKg / currentWeightKg) * 100 > progressionConfig.maximumReasonableLoadIncreasePct;
  return {
    recommendedWeightKg: guardrailExceeded
      ? null
      : direction === "increase"
        ? currentWeightKg + incrementKg
        : Math.max(0, currentWeightKg - incrementKg),
    incrementKg,
    guardrailExceeded,
    usedPreviousSuccessfulLoad: false,
  };
}
