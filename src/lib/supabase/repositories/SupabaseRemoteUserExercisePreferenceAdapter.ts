import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { CloudUserExercisePreferenceSnapshot } from "@/db/repositories";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import {
  preferenceRemoteMutationResult,
  userExercisePreferenceFromCloudRow,
  userExercisePreferenceToCloudUpsert,
} from "@/lib/supabase/mappers/userExercisePreferenceMapper";
import type { RemoteMutationResult, UserExercisePreference, UUID } from "@/shared/contracts";

import {
  RemoteUserExercisePreferenceAdapterError,
  type RemoteUserExercisePreferenceAdapter,
  type RemoteUserExercisePreferenceOperation,
} from "./RemoteUserExercisePreferenceAdapter";

export class SupabaseRemoteUserExercisePreferenceAdapter
implements RemoteUserExercisePreferenceAdapter {
  constructor(private readonly client: SupabaseClient<Database> = supabase) {}

  async fetchOwnPreferences(): Promise<CloudUserExercisePreferenceSnapshot[]> {
    const operation = "fetchOwnPreferences";
    const user = await this.requireUser(operation);
    const snapshots: CloudUserExercisePreferenceSnapshot[] = [];
    for (let offset = 0; ; offset += pageSize) {
      const result = await this.client.from("user_exercise_preferences")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (result.error || result.data.some(({ user_id }) => user_id !== user.id)) {
        throw adapterError(operation);
      }
      try {
        snapshots.push(...result.data.map(userExercisePreferenceFromCloudRow));
      } catch {
        throw adapterError(operation);
      }
      if (result.data.length < pageSize) return snapshots;
    }
  }

  async upsertOwnPreference(
    preference: UserExercisePreference,
  ): Promise<RemoteMutationResult> {
    const operation = "upsertOwnPreference";
    await this.requireOwner(preference.userId, operation);
    let payload: ReturnType<typeof userExercisePreferenceToCloudUpsert>;
    try {
      payload = userExercisePreferenceToCloudUpsert(preference);
    } catch {
      throw adapterError(operation);
    }
    const { data, error } = await this.client.from("user_exercise_preferences")
      .upsert(payload, { onConflict: "id" })
      .select("updated_at")
      .single();
    if (error || !data) throw adapterError(operation);
    return preferenceRemoteMutationResult(data);
  }

  async deleteOwnPreference(id: UUID): Promise<void> {
    const operation = "deleteOwnPreference";
    const user = await this.requireUser(operation);
    const { error } = await this.client.from("user_exercise_preferences")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id");
    if (error) throw adapterError(operation);
  }

  private async requireOwner(
    ownerUserId: UUID,
    operation: RemoteUserExercisePreferenceOperation,
  ): Promise<void> {
    const user = await this.requireUser(operation);
    if (ownerUserId !== user.id) throw adapterError(operation);
  }

  private async requireUser(operation: RemoteUserExercisePreferenceOperation): Promise<User> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) throw adapterError(operation);
    return data.user;
  }
}

const pageSize = 1000;

function adapterError(
  operation: RemoteUserExercisePreferenceOperation,
): RemoteUserExercisePreferenceAdapterError {
  return new RemoteUserExercisePreferenceAdapterError(operation);
}
