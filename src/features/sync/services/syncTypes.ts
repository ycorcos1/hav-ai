import type {
  Exercise,
  ProgressionRecommendation,
  RemoteMutationResult,
  SyncEntityType,
  SyncQueueItem,
  SyncResult,
  UserExercisePreference,
  UUID,
  Workout,
  WorkoutExercise,
  WorkoutSet,
  WorkoutTemplate,
  WorkoutTemplateExercise,
} from "@/shared/contracts";

type SyncEntityMap = {
  workout_template: WorkoutTemplate;
  workout_template_exercise: WorkoutTemplateExercise;
  custom_exercise: Exercise;
  workout: Workout;
  workout_exercise: WorkoutExercise;
  set: WorkoutSet;
  user_exercise_preference: UserExercisePreference;
  progression_recommendation: ProgressionRecommendation;
};

export type SyncUpsertMutation = {
  [EntityType in SyncEntityType]: {
    entityType: EntityType;
    operation: "upsert";
    entity: SyncEntityMap[EntityType];
  }
}[SyncEntityType];

export type SyncDeleteMutation = {
  entityType: SyncEntityType;
  entityId: UUID;
  operation: "delete";
};

export type SyncMutation = SyncUpsertMutation | SyncDeleteMutation;

export interface LocalSyncEntityStore {
  confirmDelete(item: SyncQueueItem): Promise<boolean>;
  confirmUpsert(
    item: SyncQueueItem,
    mutation: SyncUpsertMutation,
    result: RemoteMutationResult,
  ): Promise<boolean>;
  loadLatest(item: SyncQueueItem): Promise<SyncMutation | null>;
}

export interface RemoteSyncGateway {
  apply(mutation: SyncMutation): Promise<RemoteMutationResult>;
}

export interface SyncPrerequisites {
  canAttemptRequest(): Promise<boolean>;
  getAuthenticatedUserId(): Promise<UUID | null>;
}

export interface SyncProcessor {
  synchronize(): Promise<SyncResult>;
}
