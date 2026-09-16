import {
  PersistentPersonalRecordRecalculationError,
  PersistentPersonalRecordRecalculationService,
  type SyncProcessor,
} from "@/features/sync/services";
import type {
  PersonalRecordCandidate,
  PersonalRecordRepository,
} from "@/lib/supabase/repositories";
import type { PersonalRecord, SyncResult, WorkoutSet } from "@/shared/contracts";

const timestamp = "2026-09-16T12:00:00.000Z";

describe("persistent personal-record recalculation", () => {
  it("waits for raw history sync and replaces cloud state from canonical metrics", async () => {
    const sync = processor(successResult);
    const repository = new MemoryPersonalRecordRepository([
      set("set-a", "exercise-a", 100, 1),
      set("set-b", "exercise-a", 90, 8),
      set("set-c", "exercise-b", 60, 16),
      set("warmup", "exercise-b", 200, 5, "warmup"),
    ]);

    const result = await new PersistentPersonalRecordRecalculationService(
      sync,
      repository,
    ).synchronizeAndRecalculate();

    expect(sync.synchronize).toHaveBeenCalledTimes(1);
    expect(repository.operations).toEqual(["fetch", "replace"]);
    expect(repository.candidates.map(({ exerciseId, recordType, setId }) => ({
      exerciseId, recordType, setId,
    }))).toEqual([
      { exerciseId: "exercise-a", recordType: "max_weight", setId: "set-a" },
      { exerciseId: "exercise-a", recordType: "estimated_1rm", setId: "set-b" },
      { exerciseId: "exercise-b", recordType: "max_weight", setId: "set-c" },
    ]);
    expect(repository.candidates.map(({ recordType }) => String(recordType)))
      .not.toContain("rep_pr");
    expect(result.records).toHaveLength(3);
  });

  it("does not recalculate from incomplete raw-history synchronization", async () => {
    const repository = new MemoryPersonalRecordRepository([]);
    await expect(new PersistentPersonalRecordRecalculationService(
      processor({ ...successResult, success: false, remainingQueueSize: 1 }),
      repository,
    ).synchronizeAndRecalculate()).rejects.toBeInstanceOf(
      PersistentPersonalRecordRecalculationError,
    );
    expect(repository.operations).toEqual([]);
  });

  it("replaces stale derived state after history edits or deletion and is deterministic", async () => {
    const repository = new MemoryPersonalRecordRepository([
      set("old-best", "exercise-a", 100, 5),
    ]);
    const service = new PersistentPersonalRecordRecalculationService(
      processor(successResult),
      repository,
    );
    await service.synchronizeAndRecalculate();
    const first = structuredClone(repository.candidates);
    await service.synchronizeAndRecalculate();
    expect(repository.candidates).toEqual(first);

    repository.sets = [set("edited-best", "exercise-a", 80, 5)];
    await service.synchronizeAndRecalculate();
    expect(repository.candidates.every(({ setId }) => setId === "edited-best")).toBe(true);

    repository.sets = [];
    await service.synchronizeAndRecalculate();
    expect(repository.candidates).toEqual([]);
  });
});

function processor(result: SyncResult): SyncProcessor & { synchronize: jest.Mock } {
  return { synchronize: jest.fn().mockResolvedValue(result) };
}

class MemoryPersonalRecordRepository implements PersonalRecordRepository {
  readonly operations: string[] = [];
  candidates: PersonalRecordCandidate[] = [];

  constructor(public sets: WorkoutSet[]) {}

  async fetchOwnCompletedWorkingSets(): Promise<WorkoutSet[]> {
    this.operations.push("fetch");
    return this.sets;
  }

  async replaceOwnCurrentRecords(
    records: readonly PersonalRecordCandidate[],
  ): Promise<PersonalRecord[]> {
    this.operations.push("replace");
    this.candidates = [...structuredClone(records)];
    return records.map((record, index) => ({
      id: `record-${index}`,
      userId: "user-a",
      ...record,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
  }
}

function set(
  id: string,
  exerciseId: string,
  weightKg: number,
  reps: number,
  setType: WorkoutSet["setType"] = "working",
): WorkoutSet {
  return {
    id,
    userId: "user-a",
    workoutId: "workout-a",
    workoutExerciseId: `workout-exercise-${exerciseId}`,
    exerciseId,
    position: 0,
    setType,
    weightKg,
    reps,
    completedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

const successResult: SyncResult = {
  success: true,
  processed: 0,
  succeeded: 0,
  failed: 0,
  remainingQueueSize: 0,
  errors: [],
};
