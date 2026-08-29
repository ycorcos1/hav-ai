import type { ISODateTime, UUID, WeightKg } from "./common";

export type DetectedPersonalRecordType = "max_weight" | "estimated_1rm" | "rep_pr";

export type PersistedPersonalRecordType = "max_weight" | "estimated_1rm";

export type DetectedPersonalRecord = {
  type: DetectedPersonalRecordType;
  exerciseId: UUID;
  workoutId: UUID;
  setId: UUID;
  weightKg?: WeightKg;
  reps?: number;
  estimated1RMKg?: WeightKg;
  achievedAt: ISODateTime;
};

export type PersonalRecord = {
  id: UUID;
  userId: UUID;
  exerciseId: UUID;
  recordType: PersistedPersonalRecordType;
  setId: UUID;
  workoutId: UUID;
  weightKg?: WeightKg;
  reps?: number;
  estimated1RMKg?: WeightKg;
  achievedAt: ISODateTime;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};
