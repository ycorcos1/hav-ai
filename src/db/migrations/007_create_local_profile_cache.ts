import type { LocalMigration } from "./types";

export const createLocalProfileCacheMigration: LocalMigration = {
  version: 7,
  name: "create_local_profile_cache",
  async migrate(transaction) {
    await transaction.execAsync(`
      CREATE TABLE local_profile_cache (
        user_id TEXT PRIMARY KEY,
        display_name TEXT NULL,
        weight_unit TEXT NOT NULL CHECK (weight_unit IN ('lb', 'kg')),
        primary_goal TEXT NOT NULL CHECK (
          primary_goal IN ('strength', 'hypertrophy', 'hybrid')
        ),
        rpe_preference TEXT NOT NULL CHECK (
          rpe_preference IN ('hidden', 'optional', 'preferred')
        ),
        progression_style TEXT NOT NULL CHECK (
          progression_style IN ('conservative', 'balanced', 'aggressive')
        ),
        default_rest_duration_seconds INTEGER NOT NULL CHECK (
          default_rest_duration_seconds > 0
        ),
        onboarding_completed INTEGER NOT NULL CHECK (
          onboarding_completed IN (0, 1)
        ),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  },
};
