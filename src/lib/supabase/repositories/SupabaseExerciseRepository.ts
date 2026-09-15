import type { SupabaseClient } from "@supabase/supabase-js";

import { exerciseFromCloudRows } from "@/lib/supabase/mappers/exerciseMapper";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

import {
  ExerciseRepositoryError,
  type ExerciseRepository,
} from "./ExerciseRepository";

export class SupabaseExerciseRepository implements ExerciseRepository {
  constructor(private readonly client: SupabaseClient<Database> = supabase) {}

  async fetchAccessible() {
    const { data: authData, error: authError } = await this.client.auth.getUser();
    if (authError || !authData.user) throw repositoryError();

    const [exerciseResult, secondaryResult] = await Promise.all([
      this.client.from("exercises").select("*").order("name"),
      this.client.from("exercise_secondary_muscles").select("*").order("muscle_group"),
    ]);
    if (exerciseResult.error || secondaryResult.error) throw repositoryError();

    try {
      const snapshots = exerciseResult.data.map(
        (row) => exerciseFromCloudRows(row, secondaryResult.data),
      );
      if (snapshots.some(({ exercise }) => (
        !exercise.isSystem && exercise.ownerUserId !== authData.user.id
      ))) {
        throw repositoryError();
      }
      return snapshots;
    } catch {
      throw repositoryError();
    }
  }
}

function repositoryError(): ExerciseRepositoryError {
  return new ExerciseRepositoryError("fetchAccessible");
}
