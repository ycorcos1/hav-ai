import type { LocalMigration } from "./types";
import { createLocalWorkoutTablesMigration } from "./001_create_local_workout_tables";
import { createLocalTemplateTablesMigration } from "./002_create_local_template_tables";
import { createLocalProgressionRecommendationsMigration } from "./003_create_local_progression_recommendations";
import { createSyncQueueMigration } from "./004_create_sync_queue";

export const localMigrations: readonly LocalMigration[] = [
  createLocalWorkoutTablesMigration,
  createLocalTemplateTablesMigration,
  createLocalProgressionRecommendationsMigration,
  createSyncQueueMigration,
];
