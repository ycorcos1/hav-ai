import type {
  PersonalRecord,
  PersistedPersonalRecordType,
  UUID,
  WorkoutSet,
} from "@/shared/contracts";

export type PersonalRecordCandidate = {
  exerciseId: UUID;
  recordType: PersistedPersonalRecordType;
  setId: UUID;
  workoutId: UUID;
  weightKg?: number;
  reps?: number;
  estimated1RMKg?: number;
  achievedAt: string;
};

export interface PersonalRecordRepository {
  fetchOwnCompletedWorkingSets(): Promise<WorkoutSet[]>;
  replaceOwnCurrentRecords(
    records: readonly PersonalRecordCandidate[],
  ): Promise<PersonalRecord[]>;
}

export type PersonalRecordRepositoryOperation =
  | "fetchOwnCompletedWorkingSets"
  | "replaceOwnCurrentRecords";

export class PersonalRecordRepositoryError extends Error {
  readonly code = "PERSONAL_RECORD_REPOSITORY_ERROR";

  constructor(readonly operation: PersonalRecordRepositoryOperation) {
    super(`Personal record operation failed: ${operation}.`);
    this.name = "PersonalRecordRepositoryError";
  }
}
