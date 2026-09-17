import type {
  RemoteSyncGateway,
  SyncMutation,
} from "@/features/sync/services";
import {
  SupabaseExerciseRepository,
  SupabaseRemoteRecommendationAdapter,
  SupabaseRemoteUserExercisePreferenceAdapter,
  SupabaseRemoteWorkoutAdapter,
  SupabaseTemplateRepository,
  type ExerciseRepository,
  type RemoteRecommendationAdapter,
  type RemoteUserExercisePreferenceAdapter,
  type RemoteWorkoutAdapter,
  type TemplateRepository,
} from "@/lib/supabase/repositories";
import type { RemoteMutationResult } from "@/shared/contracts";

export class SupabaseRemoteSyncGateway implements RemoteSyncGateway {
  constructor(
    private readonly exercises: ExerciseRepository = new SupabaseExerciseRepository(),
    private readonly templates: TemplateRepository = new SupabaseTemplateRepository(),
    private readonly workouts: RemoteWorkoutAdapter = new SupabaseRemoteWorkoutAdapter(),
    private readonly recommendations: RemoteRecommendationAdapter =
      new SupabaseRemoteRecommendationAdapter(),
    private readonly preferences: RemoteUserExercisePreferenceAdapter =
      new SupabaseRemoteUserExercisePreferenceAdapter(),
  ) {}

  async apply(mutation: SyncMutation): Promise<RemoteMutationResult> {
    if (mutation.operation === "delete") {
      switch (mutation.entityType) {
        case "workout_template_exercise":
          await this.templates.deleteOwnTemplateExercise(mutation.entityId);
          return {};
        case "set":
          await this.workouts.deleteOwnSet(mutation.entityId);
          return {};
        case "user_exercise_preference":
          await this.preferences.deleteOwnPreference(mutation.entityId);
          return {};
        default:
          throw new UnsupportedRemoteSyncMutationError();
      }
    }

    switch (mutation.entityType) {
      case "workout_template":
        return this.templates.upsertOwnTemplate(mutation.entity);
      case "workout_template_exercise":
        return this.templates.upsertOwnTemplateExercise(mutation.entity);
      case "custom_exercise":
        return this.exercises.upsertOwnCustomExercise(mutation.entity);
      case "workout":
        return this.workouts.upsertOwnWorkout(mutation.entity);
      case "workout_exercise":
        return this.workouts.upsertOwnWorkoutExercise(mutation.entity);
      case "set":
        return this.workouts.upsertOwnSet(mutation.entity);
      case "user_exercise_preference":
        return this.preferences.upsertOwnPreference(mutation.entity);
      case "progression_recommendation":
        return this.recommendations.upsertOwnRecommendation(mutation.entity);
    }
  }
}

export class UnsupportedRemoteSyncMutationError extends Error {
  readonly code = "SYNC_UNSUPPORTED_REMOTE_MUTATION";

  constructor() {
    super("The remote synchronization mutation is not supported.");
    this.name = "UnsupportedRemoteSyncMutationError";
  }
}
