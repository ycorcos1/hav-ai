jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

import type {
  ExerciseRepository,
  RemoteRecommendationAdapter,
  RemoteUserExercisePreferenceAdapter,
  RemoteWorkoutAdapter,
  TemplateRepository,
} from "@/lib/supabase/repositories";
import {
  SupabaseRemoteSyncGateway,
  UnsupportedRemoteSyncMutationError,
} from "@/lib/supabase/services/SupabaseRemoteSyncGateway";
import type { UserExercisePreference } from "@/shared/contracts";

const preference: UserExercisePreference = {
  id: "preference-a",
  userId: "user-a",
  exerciseId: "exercise-a",
  isFavorite: true,
  createdAt: "2026-09-16T12:00:00.000Z",
  updatedAt: "2026-09-16T12:00:00.000Z",
};

describe("SupabaseRemoteSyncGateway", () => {
  it("routes preference upserts and deletes through the canonical remote adapter", async () => {
    const preferences: jest.Mocked<RemoteUserExercisePreferenceAdapter> = {
      fetchOwnPreferences: jest.fn(),
      upsertOwnPreference: jest.fn().mockResolvedValue({ serverUpdatedAt: preference.updatedAt }),
      deleteOwnPreference: jest.fn().mockResolvedValue(undefined),
    };
    const gateway = new SupabaseRemoteSyncGateway(
      unusedExercises(),
      unusedTemplates(),
      unusedWorkouts(),
      unusedRecommendations(),
      preferences,
    );

    await expect(gateway.apply({
      entityType: "user_exercise_preference",
      operation: "upsert",
      entity: preference,
    })).resolves.toEqual({ serverUpdatedAt: preference.updatedAt });
    await expect(gateway.apply({
      entityType: "user_exercise_preference",
      operation: "delete",
      entityId: preference.id,
    })).resolves.toEqual({});
    expect(preferences.upsertOwnPreference).toHaveBeenCalledWith(preference);
    expect(preferences.deleteOwnPreference).toHaveBeenCalledWith(preference.id);
  });

  it("rejects unsupported delete mutations deterministically", async () => {
    const gateway = new SupabaseRemoteSyncGateway(
      unusedExercises(),
      unusedTemplates(),
      unusedWorkouts(),
      unusedRecommendations(),
      {
        fetchOwnPreferences: jest.fn(),
        upsertOwnPreference: jest.fn(),
        deleteOwnPreference: jest.fn(),
      },
    );
    await expect(gateway.apply({
      entityType: "workout",
      operation: "delete",
      entityId: "workout-a",
    })).rejects.toBeInstanceOf(UnsupportedRemoteSyncMutationError);
  });
});

function unusedExercises(): jest.Mocked<ExerciseRepository> {
  return {
    fetchAccessible: jest.fn(),
    upsertOwnCustomExercise: jest.fn(),
  };
}

function unusedTemplates(): jest.Mocked<TemplateRepository> {
  return {
    archiveOwnTemplate: jest.fn(),
    deleteOwnTemplateExercise: jest.fn(),
    fetchOwnTemplates: jest.fn(),
    upsertOwnTemplate: jest.fn(),
    upsertOwnTemplateExercise: jest.fn(),
  };
}

function unusedWorkouts(): jest.Mocked<RemoteWorkoutAdapter> {
  return {
    deleteOwnSet: jest.fn(),
    upsertOwnSet: jest.fn(),
    upsertOwnWorkout: jest.fn(),
    upsertOwnWorkoutExercise: jest.fn(),
  };
}

function unusedRecommendations(): jest.Mocked<RemoteRecommendationAdapter> {
  return {
    updateOwnRecommendationStatus: jest.fn(),
    upsertOwnRecommendation: jest.fn(),
  };
}
