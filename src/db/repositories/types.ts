import type {
  Exercise,
  ExerciseSessionPerformance,
  ISODateTime,
  ProgressionRecommendation,
  UUID,
  Workout,
  WorkoutSet,
  WorkoutTemplate,
  UserExercisePreference,
} from "@/shared/contracts";

export interface LocalWorkoutRepository {
  getById(userId: UUID, id: UUID): Promise<Workout | null>;
  getActiveForUser(userId: UUID): Promise<Workout | null>;
  create(workout: Workout): Promise<void>;
  update(workout: Workout): Promise<void>;
  delete(userId: UUID, id: UUID): Promise<void>;
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

export interface LocalExerciseRepository {
  getById(userId: UUID, id: UUID): Promise<Exercise | null>;
  listAccessible(userId: UUID): Promise<Exercise[]>;
  search(userId: UUID, query: string): Promise<Exercise[]>;
  upsert(exercise: Exercise): Promise<void>;
  archiveCustomExercise(userId: UUID, id: UUID): Promise<void>;
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
