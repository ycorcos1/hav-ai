import type { SupabaseClient, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import {
  recommendationStatusToCloudUpdate,
  recommendationToCloudUpsert,
} from "@/lib/supabase/mappers/recommendationMapper";
import type { ProgressionRecommendation, RemoteMutationResult } from "@/shared/contracts";

import {
  RemoteRecommendationAdapterError,
  type RemoteRecommendationAdapter,
  type RemoteRecommendationAdapterOperation,
  type UpdateRecommendationStatusInput,
} from "./RemoteRecommendationAdapter";

export class SupabaseRemoteRecommendationAdapter implements RemoteRecommendationAdapter {
  constructor(private readonly client: SupabaseClient<Database> = supabase) {}

  async upsertOwnRecommendation(
    recommendation: ProgressionRecommendation,
  ): Promise<RemoteMutationResult> {
    await this.requireOwner(recommendation.userId, "upsertOwnRecommendation");
    const { data, error } = await this.client.from("progression_recommendations")
      .upsert(recommendationToCloudUpsert(recommendation), { onConflict: "id" })
      .select("updated_at")
      .single();
    if (error || !data) throw adapterError("upsertOwnRecommendation");
    return { serverUpdatedAt: data.updated_at };
  }

  async updateOwnRecommendationStatus(
    input: UpdateRecommendationStatusInput,
  ): Promise<RemoteMutationResult> {
    const user = await this.requireUser("updateOwnRecommendationStatus");
    const { data, error } = await this.client.from("progression_recommendations")
      .update(recommendationStatusToCloudUpdate(input))
      .eq("id", input.id)
      .eq("user_id", user.id)
      .select("updated_at")
      .single();
    if (error || !data) throw adapterError("updateOwnRecommendationStatus");
    return { serverUpdatedAt: data.updated_at };
  }

  private async requireOwner(
    ownerUserId: string,
    operation: RemoteRecommendationAdapterOperation,
  ): Promise<void> {
    const user = await this.requireUser(operation);
    if (ownerUserId !== user.id) throw adapterError(operation);
  }

  private async requireUser(operation: RemoteRecommendationAdapterOperation): Promise<User> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) throw adapterError(operation);
    return data.user;
  }
}

function adapterError(
  operation: RemoteRecommendationAdapterOperation,
): RemoteRecommendationAdapterError {
  return new RemoteRecommendationAdapterError(operation);
}
