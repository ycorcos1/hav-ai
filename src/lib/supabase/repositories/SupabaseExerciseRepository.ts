import type { SupabaseClient } from "@supabase/supabase-js";

import {
  exerciseFromCloudRows,
  exerciseRemoteMutationResult,
  exerciseSecondaryMusclesToCloudUpserts,
  exerciseToCloudUpsert,
} from "@/lib/supabase/mappers/exerciseMapper";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { Exercise } from "@/shared/contracts";

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

  async upsertOwnCustomExercise(exercise: Exercise) {
    const { data: authData, error: authError } = await this.client.auth.getUser();
    if (authError || !authData.user) throw repositoryError("upsertOwnCustomExercise");
    if (exercise.isSystem || exercise.ownerUserId !== authData.user.id) {
      throw repositoryError("upsertOwnCustomExercise");
    }

    const { data, error } = await this.client.from("exercises")
      .upsert(exerciseToCloudUpsert(exercise), { onConflict: "id" })
      .select("updated_at")
      .single();
    if (error || !data) throw repositoryError("upsertOwnCustomExercise");

    const current = await this.client.from("exercise_secondary_muscles")
      .select("muscle_group")
      .eq("exercise_id", exercise.id);
    if (current.error) throw repositoryError("upsertOwnCustomExercise");

    const desired = new Set<string>(exercise.secondaryMuscleGroups);
    const stale = current.data
      .map(({ muscle_group: muscleGroup }) => muscleGroup)
      .filter((muscleGroup) => !desired.has(muscleGroup));
    if (stale.length > 0) {
      const { error: deleteError } = await this.client.from("exercise_secondary_muscles")
        .delete()
        .eq("exercise_id", exercise.id)
        .in("muscle_group", stale);
      if (deleteError) throw repositoryError("upsertOwnCustomExercise");
    }

    const secondaryRows = exerciseSecondaryMusclesToCloudUpserts(exercise);
    if (secondaryRows.length > 0) {
      const { error: secondaryError } = await this.client.from("exercise_secondary_muscles")
        .upsert(secondaryRows, { onConflict: "exercise_id,muscle_group" });
      if (secondaryError) throw repositoryError("upsertOwnCustomExercise");
    }

    return exerciseRemoteMutationResult(data);
  }
}

function repositoryError(
  operation: "fetchAccessible" | "upsertOwnCustomExercise" = "fetchAccessible",
): ExerciseRepositoryError {
  return new ExerciseRepositoryError(operation);
}
