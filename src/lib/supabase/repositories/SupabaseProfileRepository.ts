import type { SupabaseClient } from "@supabase/supabase-js";

import { profileFromRow, profileToInsert, profileToUpdate } from "@/lib/supabase/mappers/profileMapper";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { UserProfile } from "@/shared/contracts";

import {
  ProfileRepositoryError,
  type CreateOwnProfileInput,
  type ProfileRepository,
  type ProfileRepositoryOperation,
  type UpdateOwnProfileInput,
} from "./ProfileRepository";

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: SupabaseClient<Database> = supabase) {}

  async getOwnProfile(): Promise<UserProfile | null> {
    const { data, error } = await this.client.from("profiles").select("*").maybeSingle();

    if (error) throw repositoryError("getOwnProfile");
    if (!data) return null;

    return mapProfile(data, "getOwnProfile");
  }

  async createOwnProfile(input: CreateOwnProfileInput): Promise<UserProfile> {
    const { data, error } = await this.client
      .from("profiles")
      .insert(profileToInsert(input))
      .select("*")
      .single();

    if (error || !data) throw repositoryError("createOwnProfile");

    return mapProfile(data, "createOwnProfile");
  }

  async updateOwnProfile(input: UpdateOwnProfileInput): Promise<UserProfile> {
    const { data: authData, error: authError } = await this.client.auth.getUser();
    if (authError || !authData.user) throw repositoryError("updateOwnProfile");

    const { data, error } = await this.client
      .from("profiles")
      .update(profileToUpdate(input))
      .eq("user_id", authData.user.id)
      .select("*")
      .single();

    if (error || !data) throw repositoryError("updateOwnProfile");

    return mapProfile(data, "updateOwnProfile");
  }
}

function mapProfile(
  row: Database["public"]["Tables"]["profiles"]["Row"],
  operation: ProfileRepositoryOperation,
): UserProfile {
  try {
    return profileFromRow(row);
  } catch {
    throw repositoryError(operation);
  }
}

function repositoryError(operation: ProfileRepositoryOperation): ProfileRepositoryError {
  return new ProfileRepositoryError(operation);
}
