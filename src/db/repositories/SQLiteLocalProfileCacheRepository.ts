import type { LocalProfileCacheRepository } from "@/db/repositories/types";
import type { LocalDatabaseConnection } from "@/db/types";
import type { UserProfile } from "@/shared/contracts";

type LocalProfileCacheRow = {
  user_id: string;
  display_name: string | null;
  weight_unit: UserProfile["weightUnit"];
  primary_goal: UserProfile["primaryGoal"];
  rpe_preference: UserProfile["rpePreference"];
  progression_style: UserProfile["progressionStyle"];
  default_rest_duration_seconds: number;
  onboarding_completed: number;
  created_at: string;
  updated_at: string;
};

export class SQLiteLocalProfileCacheRepository implements LocalProfileCacheRepository {
  constructor(private readonly database: LocalDatabaseConnection) {}

  async get(userId: string): Promise<UserProfile | null> {
    const row = await this.database.getFirstAsync<LocalProfileCacheRow>(
      "SELECT * FROM local_profile_cache WHERE user_id = ?;",
      userId,
    );

    return row ? profileFromRow(row) : null;
  }

  async upsert(profile: UserProfile): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO local_profile_cache (
         user_id, display_name, weight_unit, primary_goal, rpe_preference,
         progression_style, default_rest_duration_seconds,
         onboarding_completed, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         display_name=excluded.display_name,
         weight_unit=excluded.weight_unit,
         primary_goal=excluded.primary_goal,
         rpe_preference=excluded.rpe_preference,
         progression_style=excluded.progression_style,
         default_rest_duration_seconds=excluded.default_rest_duration_seconds,
         onboarding_completed=excluded.onboarding_completed,
         created_at=excluded.created_at,
         updated_at=excluded.updated_at;`,
      profile.userId,
      profile.displayName ?? null,
      profile.weightUnit,
      profile.primaryGoal,
      profile.rpePreference,
      profile.progressionStyle,
      profile.defaultRestDurationSeconds,
      profile.onboardingCompleted ? 1 : 0,
      profile.createdAt,
      profile.updatedAt,
    );
  }
}

function profileFromRow(row: LocalProfileCacheRow): UserProfile {
  return {
    userId: row.user_id,
    ...(row.display_name === null ? {} : { displayName: row.display_name }),
    weightUnit: row.weight_unit,
    primaryGoal: row.primary_goal,
    rpePreference: row.rpe_preference,
    progressionStyle: row.progression_style,
    defaultRestDurationSeconds: row.default_rest_duration_seconds,
    onboardingCompleted: row.onboarding_completed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
