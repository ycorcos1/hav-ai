import type {
  Exercise,
  ExerciseSessionPerformance,
  ISODateTime,
  ProgressionRecommendation,
  UserProfile,
  UUID,
  Workout,
  WorkoutSet,
  WorkoutTemplate,
  UserExercisePreference,
  SyncQueueItem,
} from "@/shared/contracts";

export type CloudHydrationResult = "hydrated" | "preserved_dirty";

export type CloudExerciseSnapshot = {
  exercise: Exercise;
  serverUpdatedAt: ISODateTime;
};

export type CloudTemplateSnapshot = {
  exerciseServerUpdatedAtById: Readonly<Record<UUID, ISODateTime>>;
  serverUpdatedAt: ISODateTime;
  template: WorkoutTemplate;
};

export type CloudUserExercisePreferenceSnapshot = {
  preference: UserExercisePreference;
  serverUpdatedAt: ISODateTime;
};

export type CachedRecentExerciseSession = {
  id: UUID;
  userId: UUID;
  exerciseId: UUID;
  workoutId: UUID;
  completedAt: ISODateTime;
  targetSets?: number;
  targetMinReps?: number;
  targetMaxReps?: number;
  workingSets: ExerciseSessionPerformance["sets"];
  serverUpdatedAt?: ISODateTime;
};

export interface LocalWorkoutRepository {
  getById(userId: UUID, id: UUID): Promise<Workout | null>;
  getActiveForUser(userId: UUID): Promise<Workout | null>;
  create(workout: Workout): Promise<void>;
  update(workout: Workout): Promise<void>;
  delete(userId: UUID, id: UUID): Promise<void>;
}

export interface LocalProfileCacheRepository {
  get(userId: UUID): Promise<UserProfile | null>;
  upsert(profile: UserProfile): Promise<void>;
}

export interface ExerciseHistoryRepository {
  getRecentSessions(params: {
    userId: UUID;
    exerciseId: UUID;
    limit: number;
  }): Promise<ExerciseSessionPerformance[]>;
  getBestSet(params: {
    userId: UUID;
    exerciseId: UUID;
  }): Promise<WorkoutSet | null>;
}

export interface RecentExerciseSessionCacheRepository {
  replaceForUser(
    userId: UUID,
    sessions: CachedRecentExerciseSession[],
    limitPerExercise: number,
  ): Promise<number>;
}

export interface LocalSetRepository {
  getById(userId: UUID, id: UUID): Promise<WorkoutSet | null>;
  getForWorkoutExercise(userId: UUID, workoutExerciseId: UUID): Promise<WorkoutSet[]>;
  create(set: WorkoutSet): Promise<void>;
  update(set: WorkoutSet): Promise<void>;
  deleteOrTombstone(userId: UUID, id: UUID): Promise<void>;
}

export interface LocalTemplateRepository {
  getById(userId: UUID, id: UUID): Promise<WorkoutTemplate | null>;
  listForUser(userId: UUID): Promise<WorkoutTemplate[]>;
  create(template: WorkoutTemplate): Promise<void>;
  update(template: WorkoutTemplate): Promise<void>;
  archive(userId: UUID, id: UUID): Promise<void>;
}

export interface LocalTemplateHydrationRepository {
  hydrateFromCloud(
    userId: UUID,
    snapshot: CloudTemplateSnapshot,
  ): Promise<CloudHydrationResult>;
}

export interface LocalExerciseRepository {
  getById(userId: UUID, id: UUID): Promise<Exercise | null>;
  listAccessible(userId: UUID): Promise<Exercise[]>;
  search(userId: UUID, query: string): Promise<Exercise[]>;
  upsert(exercise: Exercise): Promise<void>;
  archiveCustomExercise(userId: UUID, id: UUID): Promise<void>;
}

export interface LocalExerciseHydrationRepository {
  hydrateFromCloud(
    userId: UUID,
    snapshot: CloudExerciseSnapshot,
  ): Promise<CloudHydrationResult>;
}

export interface SyncQueueRepository {
  enqueueOrCoalesce(item: SyncQueueItem): Promise<void>;
  getPending(): Promise<SyncQueueItem[]>;
  markAttempt(id: UUID, error?: string): Promise<void>;
  remove(id: UUID): Promise<void>;
}

export interface LocalRecommendationRepository {
  getById(userId: UUID, id: UUID): Promise<ProgressionRecommendation | null>;
  getActiveForExercise(
    userId: UUID,
    exerciseId: UUID,
  ): Promise<ProgressionRecommendation | null>;
  upsert(recommendation: ProgressionRecommendation): Promise<void>;
  markConsumed(userId: UUID, id: UUID, consumedAt: ISODateTime): Promise<void>;
  supersede(userId: UUID, id: UUID): Promise<void>;
}

export interface LocalUserExercisePreferenceRepository {
  get(userId: UUID, exerciseId: UUID): Promise<UserExercisePreference | null>;
  listFavorites(userId: UUID): Promise<UserExercisePreference[]>;
  upsert(preference: UserExercisePreference): Promise<void>;
  deleteOrTombstone(userId: UUID, id: UUID): Promise<void>;
}

export type UserExercisePreferenceReconciliationResult = {
  hydrated: number;
  removed: number;
  preservedDirty: number;
};

export interface LocalUserExercisePreferenceHydrationRepository {
  reconcileFromCloud(
    userId: UUID,
    snapshots: readonly CloudUserExercisePreferenceSnapshot[],
  ): Promise<UserExercisePreferenceReconciliationResult>;
}
