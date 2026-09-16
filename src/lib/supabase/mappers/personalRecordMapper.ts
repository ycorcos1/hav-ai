import type { Database } from "@/lib/supabase/database.types";
import type { PersonalRecord } from "@/shared/contracts";

import type { PersonalRecordCandidate } from "../repositories/PersonalRecordRepository";

type PersonalRecordTable = Database["public"]["Tables"]["personal_records"];
type PersonalRecordRow = PersonalRecordTable["Row"];

export function personalRecordFromCloudRow(row: PersonalRecordRow): PersonalRecord {
  if (row.record_type !== "max_weight" && row.record_type !== "estimated_1rm") {
    throw new Error("Cloud personal record type is invalid.");
  }
  if (row.record_type === "max_weight" && row.weight_kg === null) {
    throw new Error("Cloud max-weight record is incomplete.");
  }
  if (row.record_type === "estimated_1rm" && row.estimated_1rm_kg === null) {
    throw new Error("Cloud e1RM record is incomplete.");
  }
  return {
    id: row.id,
    userId: row.user_id,
    exerciseId: row.exercise_id,
    recordType: row.record_type,
    setId: row.set_id,
    workoutId: row.workout_id,
    ...(row.weight_kg === null ? {} : { weightKg: row.weight_kg }),
    ...(row.reps === null ? {} : { reps: row.reps }),
    ...(row.estimated_1rm_kg === null ? {} : { estimated1RMKg: row.estimated_1rm_kg }),
    achievedAt: row.achieved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function personalRecordToCloudUpsert(
  id: string,
  userId: string,
  record: PersonalRecordCandidate,
): PersonalRecordTable["Insert"] {
  return {
    id,
    user_id: userId,
    exercise_id: record.exerciseId,
    record_type: record.recordType,
    set_id: record.setId,
    workout_id: record.workoutId,
    weight_kg: record.weightKg ?? null,
    reps: record.reps ?? null,
    estimated_1rm_kg: record.estimated1RMKg ?? null,
    achieved_at: record.achievedAt,
  };
}
