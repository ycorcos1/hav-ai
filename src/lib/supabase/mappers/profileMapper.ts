import type { Database } from "@/lib/supabase/database.types";
import type { UserProfile } from "@/shared/contracts";
import { userProfileSchema } from "@/shared/schemas/profile";

import type {
  CreateOwnProfileInput,
  UpdateOwnProfileInput,
} from "../repositories/ProfileRepository";

type ProfileTable = Database["public"]["Tables"]["profiles"];
type ProfileRow = ProfileTable["Row"];
type ProfileInsert = ProfileTable["Insert"];
type ProfileUpdate = ProfileTable["Update"];

export function profileFromRow(row: ProfileRow): UserProfile {
  return userProfileSchema.parse({
    userId: row.user_id,
    displayName: row.display_name ?? undefined,
    weightUnit: row.weight_unit,
    primaryGoal: row.primary_goal,
    rpePreference: row.rpe_preference,
    progressionStyle: row.progression_style,
    defaultRestDurationSeconds: row.default_rest_duration_seconds,
    onboardingCompleted: row.onboarding_completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function profileToInsert(input: CreateOwnProfileInput): ProfileInsert {
  const payload: ProfileInsert = {
    user_id: input.userId,
    weight_unit: input.weightUnit,
    primary_goal: input.primaryGoal,
  };

  if (input.displayName !== undefined) payload.display_name = input.displayName;
  if (input.rpePreference !== undefined) payload.rpe_preference = input.rpePreference;
  if (input.progressionStyle !== undefined) payload.progression_style = input.progressionStyle;
  if (input.defaultRestDurationSeconds !== undefined) {
    payload.default_rest_duration_seconds = input.defaultRestDurationSeconds;
  }
  if (input.onboardingCompleted !== undefined) {
    payload.onboarding_completed = input.onboardingCompleted;
  }

  return payload;
}

export function profileToUpdate(input: UpdateOwnProfileInput): ProfileUpdate {
  const payload: ProfileUpdate = {};

  if ("displayName" in input) payload.display_name = input.displayName ?? null;
  if (input.weightUnit !== undefined) payload.weight_unit = input.weightUnit;
  if (input.primaryGoal !== undefined) payload.primary_goal = input.primaryGoal;
  if (input.rpePreference !== undefined) payload.rpe_preference = input.rpePreference;
  if (input.progressionStyle !== undefined) payload.progression_style = input.progressionStyle;
  if (input.defaultRestDurationSeconds !== undefined) {
    payload.default_rest_duration_seconds = input.defaultRestDurationSeconds;
  }
  if (input.onboardingCompleted !== undefined) {
    payload.onboarding_completed = input.onboardingCompleted;
  }

  return payload;
}
