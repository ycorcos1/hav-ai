import { detectPersonalRecords } from "@/features/metrics";
import type {
  PersonalRecordCandidate,
  PersonalRecordRepository,
} from "@/lib/supabase/repositories";
import type { PersonalRecord } from "@/shared/contracts";

import type { SyncProcessor } from "./syncTypes";

export type PersistentPersonalRecordRecalculationResult = {
  records: PersonalRecord[];
};

export class PersistentPersonalRecordRecalculationError extends Error {
  readonly code = "PERSONAL_RECORD_RECALCULATION_ERROR";

  constructor() {
    super("Personal record recalculation is not currently available.");
    this.name = "PersistentPersonalRecordRecalculationError";
  }
}

export class PersistentPersonalRecordRecalculationService {
  constructor(
    private readonly pushProcessor: SyncProcessor,
    private readonly repository: PersonalRecordRepository,
  ) {}

  async synchronizeAndRecalculate(): Promise<PersistentPersonalRecordRecalculationResult> {
    const syncResult = await this.pushProcessor.synchronize();
    if (!syncResult.success) throw new PersistentPersonalRecordRecalculationError();
    const sets = await this.repository.fetchOwnCompletedWorkingSets();
    const candidates = detectPersonalRecords(sets, [])
      .flatMap(toPersistentCandidate);
    const records = await this.repository.replaceOwnCurrentRecords(candidates);
    return { records };
  }
}

function toPersistentCandidate(
  record: ReturnType<typeof detectPersonalRecords>[number],
): PersonalRecordCandidate[] {
  if (record.type === "rep_pr") return [];
  return [{
    exerciseId: record.exerciseId,
    recordType: record.type,
    setId: record.setId,
    workoutId: record.workoutId,
    ...(record.weightKg === undefined ? {} : { weightKg: record.weightKg }),
    ...(record.reps === undefined ? {} : { reps: record.reps }),
    ...(record.estimated1RMKg === undefined
      ? {}
      : { estimated1RMKg: record.estimated1RMKg }),
    achievedAt: record.achievedAt,
  }];
}
