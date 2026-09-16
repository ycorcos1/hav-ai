import type { SupabaseClient, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import {
  personalRecordFromCloudRow,
  personalRecordToCloudUpsert,
} from "@/lib/supabase/mappers/personalRecordMapper";
import { workoutSetFromCloudRow } from "@/lib/supabase/mappers/workoutMapper";
import type { PersonalRecord, WorkoutSet } from "@/shared/contracts";

import {
  PersonalRecordRepositoryError,
  type PersonalRecordCandidate,
  type PersonalRecordRepository,
  type PersonalRecordRepositoryOperation,
} from "./PersonalRecordRepository";

type PersonalRecordRow = Database["public"]["Tables"]["personal_records"]["Row"];

export class SupabasePersonalRecordRepository implements PersonalRecordRepository {
  constructor(
    private readonly client: SupabaseClient<Database> = supabase,
    private readonly createId: () => string = createUuid,
  ) {}

  async fetchOwnCompletedWorkingSets(): Promise<WorkoutSet[]> {
    const operation = "fetchOwnCompletedWorkingSets";
    const user = await this.requireUser(operation);
    const sets: WorkoutSet[] = [];
    for (let workoutOffset = 0; ; workoutOffset += workoutPageSize) {
      const workouts = await this.client.from("workouts")
        .select("id,user_id")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .range(workoutOffset, workoutOffset + workoutPageSize - 1);
      if (workouts.error || workouts.data.some(({ user_id }) => user_id !== user.id)) {
        throw repositoryError(operation);
      }
      const workoutIds = workouts.data.map(({ id }) => id);
      if (workoutIds.length > 0) {
        for (let setOffset = 0; ; setOffset += setPageSize) {
          const result = await this.client.from("sets")
            .select("*")
            .eq("user_id", user.id)
            .in("workout_id", workoutIds)
            .eq("set_type", "working")
            .order("completed_at", { ascending: true })
            .range(setOffset, setOffset + setPageSize - 1);
          if (result.error || result.data.some(({ user_id }) => user_id !== user.id)) {
            throw repositoryError(operation);
          }
          try {
            sets.push(...result.data.map(workoutSetFromCloudRow));
          } catch {
            throw repositoryError(operation);
          }
          if (result.data.length < setPageSize) break;
        }
      }
      if (workouts.data.length < workoutPageSize) return sets;
    }
  }

  async replaceOwnCurrentRecords(
    records: readonly PersonalRecordCandidate[],
  ): Promise<PersonalRecord[]> {
    const operation = "replaceOwnCurrentRecords";
    const user = await this.requireUser(operation);
    assertCandidates(records, operation);
    const currentResult = await this.client.from("personal_records")
      .select("*")
      .eq("user_id", user.id);
    if (currentResult.error) throw repositoryError(operation);
    assertOwned(currentResult.data, user.id, operation);

    const currentByKey = new Map(currentResult.data.map((row) => [recordKey(row), row]));
    let persistedRows: PersonalRecordRow[] = [];
    if (records.length > 0) {
      const payloads = records.map((record) => personalRecordToCloudUpsert(
        currentByKey.get(candidateKey(record))?.id ?? this.createId(),
        user.id,
        record,
      ));
      const upsertResult = await this.client.from("personal_records")
        .upsert(payloads, { onConflict: "user_id,exercise_id,record_type" })
        .select("*");
      if (upsertResult.error) throw repositoryError(operation);
      assertOwned(upsertResult.data, user.id, operation);
      persistedRows = upsertResult.data;
    }

    const nextKeys = new Set(records.map(candidateKey));
    const staleIds = currentResult.data
      .filter((row) => !nextKeys.has(recordKey(row)))
      .map(({ id }) => id);
    if (staleIds.length > 0) {
      const deleteResult = await this.client.from("personal_records")
        .delete()
        .eq("user_id", user.id)
        .in("id", staleIds)
        .select("id");
      if (deleteResult.error || deleteResult.data.length !== staleIds.length) {
        throw repositoryError(operation);
      }
    }

    try {
      return persistedRows.map(personalRecordFromCloudRow).sort(compareRecords);
    } catch {
      throw repositoryError(operation);
    }
  }

  private async requireUser(operation: PersonalRecordRepositoryOperation): Promise<User> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) throw repositoryError(operation);
    return data.user;
  }
}

function assertCandidates(
  records: readonly PersonalRecordCandidate[],
  operation: PersonalRecordRepositoryOperation,
): void {
  const keys = records.map(candidateKey);
  const valid = records.every((record) => (
    record.recordType === "max_weight"
      ? record.weightKg !== undefined && record.weightKg > 0
      : record.estimated1RMKg !== undefined && record.estimated1RMKg > 0
  ));
  if (!valid || new Set(keys).size !== keys.length) throw repositoryError(operation);
}

function assertOwned(
  rows: { user_id: string }[],
  userId: string,
  operation: PersonalRecordRepositoryOperation,
): void {
  if (rows.some(({ user_id: ownerUserId }) => ownerUserId !== userId)) {
    throw repositoryError(operation);
  }
}

function recordKey(row: Pick<PersonalRecordRow, "exercise_id" | "record_type">): string {
  return `${row.exercise_id}:${row.record_type}`;
}

function candidateKey(record: PersonalRecordCandidate): string {
  return `${record.exerciseId}:${record.recordType}`;
}

function compareRecords(left: PersonalRecord, right: PersonalRecord): number {
  return left.exerciseId.localeCompare(right.exerciseId)
    || left.recordType.localeCompare(right.recordType);
}

function createUuid(): string {
  const cryptoApi = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  throw repositoryError("replaceOwnCurrentRecords");
}

const workoutPageSize = 100;
const setPageSize = 1000;

function repositoryError(
  operation: PersonalRecordRepositoryOperation,
): PersonalRecordRepositoryError {
  return new PersonalRecordRepositoryError(operation);
}
