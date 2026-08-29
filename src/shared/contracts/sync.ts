import type { ISODateTime, UUID } from "./common";

export type SyncEntityType =
  | "workout_template"
  | "workout_template_exercise"
  | "custom_exercise"
  | "workout"
  | "workout_exercise"
  | "set"
  | "user_exercise_preference"
  | "progression_recommendation";

export type SyncOperation = "upsert" | "delete";

export type SyncQueueItem = {
  id: UUID;
  entityType: SyncEntityType;
  entityId: UUID;
  operation: SyncOperation;
  attemptCount: number;
  createdAt: ISODateTime;
  lastAttemptAt?: ISODateTime;
  lastError?: string;
};

export type SyncResult = {
  success: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  remainingQueueSize: number;
  errors: {
    queueItemId: UUID;
    entityType: SyncEntityType;
    entityId: UUID;
    code: string;
  }[];
};

export type LocalSyncStatus =
  | "synced"
  | "pending_create"
  | "pending_update"
  | "pending_delete"
  | "failed";

export type UserFacingSyncStatus = "Saved" | "Syncing" | "Offline" | "Needs Attention";
