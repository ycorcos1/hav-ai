import type { ISODateTime, UUID } from "./common";

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core"
  | "forearms"
  | "full_body"
  | "other";

export type EquipmentType =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "smith_machine"
  | "plate_loaded"
  | "kettlebell"
  | "band"
  | "other";

export type MeasurementType = "weight_reps" | "bodyweight_reps" | "reps_only";

export type Exercise = {
  id: UUID;
  ownerUserId?: UUID;
  name: string;
  primaryMuscleGroup: MuscleGroup;
  secondaryMuscleGroups: MuscleGroup[];
  equipmentType: EquipmentType;
  measurementType: MeasurementType;
  isSystem: boolean;
  isArchived: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};
