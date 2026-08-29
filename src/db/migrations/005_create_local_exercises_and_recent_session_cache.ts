import type { LocalMigration } from "./types";

export const createLocalExercisesAndRecentSessionCacheMigration: LocalMigration = {
  version: 5,
  name: "create_local_exercises_and_recent_session_cache",
  async migrate(transaction) {
    await transaction.execAsync(`
      CREATE TABLE local_exercises (
        id TEXT PRIMARY KEY,
        owner_user_id TEXT NULL,
        name TEXT NOT NULL,
        primary_muscle_group TEXT NOT NULL CHECK (
          primary_muscle_group IN (
            'chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings',
            'glutes', 'calves', 'core', 'forearms', 'full_body', 'other'
          )
        ),
        secondary_muscle_groups_json TEXT NOT NULL CHECK (
          json_valid(secondary_muscle_groups_json)
          AND json_type(secondary_muscle_groups_json) = 'array'
        ),
        equipment_type TEXT NOT NULL CHECK (
          equipment_type IN (
            'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'smith_machine',
            'plate_loaded', 'kettlebell', 'band', 'other'
          )
        ),
        measurement_type TEXT NOT NULL CHECK (
          measurement_type IN ('weight_reps', 'bodyweight_reps', 'reps_only')
        ),
        is_system INTEGER NOT NULL CHECK (is_system IN (0, 1)),
        is_archived INTEGER NOT NULL CHECK (is_archived IN (0, 1)),
        sync_status TEXT NOT NULL CHECK (
          sync_status IN ('synced', 'pending_create', 'pending_update', 'pending_delete', 'failed')
        ),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        server_updated_at TEXT NULL,
        CHECK (
          (is_system = 1 AND owner_user_id IS NULL AND sync_status = 'synced')
          OR (is_system = 0 AND owner_user_id IS NOT NULL)
        )
      );

      CREATE TABLE cached_recent_exercise_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        workout_id TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        target_sets INTEGER NULL CHECK (target_sets IS NULL OR target_sets > 0),
        target_min_reps INTEGER NULL CHECK (target_min_reps IS NULL OR target_min_reps > 0),
        target_max_reps INTEGER NULL CHECK (target_max_reps IS NULL OR target_max_reps > 0),
        working_sets_json TEXT NOT NULL CHECK (
          json_valid(working_sets_json) AND json_type(working_sets_json) = 'array'
        ),
        server_updated_at TEXT NULL,
        CHECK (
          target_min_reps IS NULL
          OR target_max_reps IS NULL
          OR target_max_reps >= target_min_reps
        )
      );

      CREATE INDEX local_exercises_owner_user_idx ON local_exercises(owner_user_id);
      CREATE INDEX local_exercises_name_idx ON local_exercises(name);
      CREATE INDEX local_exercises_system_archived_idx
        ON local_exercises(is_system, is_archived);
      CREATE INDEX cached_recent_sessions_user_exercise_completed_idx
        ON cached_recent_exercise_sessions(user_id, exercise_id, completed_at DESC);
    `);
  },
};
