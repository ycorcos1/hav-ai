import type { SupabaseClient, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import {
  workoutExerciseToCloudUpsert,
  workoutSetToCloudUpsert,
  workoutToCloudUpsert,
} from "@/lib/supabase/mappers/workoutMapper";
import type {
  RemoteMutationResult,
  UUID,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from "@/shared/contracts";

import {
  RemoteWorkoutAdapterError,
  type RemoteWorkoutAdapter,
  type RemoteWorkoutAdapterOperation,
} from "./RemoteWorkoutAdapter";

export class SupabaseRemoteWorkoutAdapter implements RemoteWorkoutAdapter {
  constructor(private readonly client: SupabaseClient<Database> = supabase) {}

  async upsertOwnWorkout(workout: Workout): Promise<RemoteMutationResult> {
    await this.requireOwner(workout.userId, "upsertOwnWorkout");
    const { data, error } = await this.client.from("workouts")
      .upsert(workoutToCloudUpsert(workout), { onConflict: "id" })
      .select("updated_at")
      .single();
    if (error || !data) throw adapterError("upsertOwnWorkout");
    return { serverUpdatedAt: data.updated_at };
  }

  async upsertOwnWorkoutExercise(
    exercise: WorkoutExercise,
  ): Promise<RemoteMutationResult> {
    await this.requireOwner(exercise.userId, "upsertOwnWorkoutExercise");
    const { data, error } = await this.client.from("workout_exercises")
      .upsert(workoutExerciseToCloudUpsert(exercise), { onConflict: "id" })
      .select("updated_at")
      .single();
    if (error || !data) throw adapterError("upsertOwnWorkoutExercise");
    return { serverUpdatedAt: data.updated_at };
  }

  async upsertOwnSet(set: WorkoutSet): Promise<RemoteMutationResult> {
    await this.requireOwner(set.userId, "upsertOwnSet");
    const { data, error } = await this.client.from("sets")
      .upsert(workoutSetToCloudUpsert(set), { onConflict: "id" })
      .select("updated_at")
      .single();
    if (error || !data) throw adapterError("upsertOwnSet");
    return { serverUpdatedAt: data.updated_at };
  }

  async deleteOwnSet(id: UUID): Promise<void> {
    const user = await this.requireUser("deleteOwnSet");
    const { data, error } = await this.client.from("sets")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .single();
    if (error || !data) throw adapterError("deleteOwnSet");
  }

  private async requireOwner(
    ownerUserId: UUID,
    operation: RemoteWorkoutAdapterOperation,
  ): Promise<void> {
    const user = await this.requireUser(operation);
    if (ownerUserId !== user.id) throw adapterError(operation);
  }

  private async requireUser(operation: RemoteWorkoutAdapterOperation): Promise<User> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) throw adapterError(operation);
    return data.user;
  }
}

function adapterError(operation: RemoteWorkoutAdapterOperation): RemoteWorkoutAdapterError {
  return new RemoteWorkoutAdapterError(operation);
}
