import type { EquipmentType } from "@/shared/contracts";

const poundsToKilograms = 0.45359237;

const defaultIncrementKg: Partial<Record<EquipmentType, number>> = {
  barbell: 5 * poundsToKilograms,
  dumbbell: 5 * poundsToKilograms,
  machine: 10 * poundsToKilograms,
  cable: 10 * poundsToKilograms,
  smith_machine: 5 * poundsToKilograms,
  plate_loaded: 5 * poundsToKilograms,
  kettlebell: 4,
  other: 2.5,
};

export function getDefaultWeightIncrementKg(equipmentType: EquipmentType): number | undefined {
  return defaultIncrementKg[equipmentType];
}
