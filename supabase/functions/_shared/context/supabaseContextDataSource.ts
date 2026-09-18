import type { SupabaseClient } from "@supabase/supabase-js";

import { analyzeExerciseTrend } from "@/features/progression/metrics";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { ExerciseSessionPerformance, RPE } from "@/shared/contracts";

import { AIContextFailure } from "./errors.ts";
import type {
  AIExercise,
  AIProfilePreferences,
  AIRecentSession,
  AIRecommendation,
  AITrendMetrics,
  CoachContextDataSource,
  RecommendationContextDataSource,
} from "./types.ts";

type WorkoutExerciseContextRow = {
  id: string;
  workout_id: string;
  exercise_id: string;
  notes: string | null;
  workouts: {
    completed_at: string | null;
    notes: string | null;
    status: string;
  };
};

export class SupabaseAIContextDataSource
  implements CoachContextDataSource, RecommendationContextDataSource
{
  constructor(private readonly client: SupabaseClient<Database>) {}

  async getProfilePreferences(userId: string): Promise<AIProfilePreferences | null> {
    const { data, error } = await this.client
      .from("profiles")
      .select("primary_goal, progression_style, weight_unit, rpe_preference")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new AIContextFailure("CONTEXT_UNAVAILABLE");
    return data
      ? {
          primaryGoal: data.primary_goal,
          progressionStyle: data.progression_style,
          weightUnit: data.weight_unit,
          rpePreference: data.rpe_preference,
        }
      : null;
  }

  async getAccessibleExercise(userId: string, exerciseId: string): Promise<AIExercise | null> {
    const { data, error } = await this.client
      .from("exercises")
      .select("id, name, measurement_type, is_system, owner_user_id")
      .eq("id", exerciseId)
      .maybeSingle();
    if (error) throw new AIContextFailure("CONTEXT_UNAVAILABLE");
    if (!data || (!data.is_system && data.owner_user_id !== userId)) return null;
    return { id: data.id, name: data.name, measurementType: data.measurement_type };
  }

  async getOwnedWorkout(userId: string, workoutId: string): Promise<{ id: string } | null> {
    const { data, error } = await this.client
      .from("workouts")
      .select("id")
      .eq("id", workoutId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new AIContextFailure("CONTEXT_UNAVAILABLE");
    return data;
  }

  async getExercisePreferenceNote(userId: string, exerciseId: string): Promise<string | null> {
    const { data, error } = await this.client
      .from("user_exercise_preferences")
      .select("notes")
      .eq("user_id", userId)
      .eq("exercise_id", exerciseId)
      .maybeSingle();
    if (error) throw new AIContextFailure("CONTEXT_UNAVAILABLE");
    return data?.notes ?? null;
  }

  async getRecentSessions(
    userId: string,
    exerciseId: string,
    limit: number,
  ): Promise<AIRecentSession[]> {
    const { data, error } = await this.client
      .from("workout_exercises")
      .select(
        "id, workout_id, exercise_id, notes, workouts!workout_exercises_owned_workout_fkey!inner(completed_at, notes, status)",
      )
      .eq("user_id", userId)
      .eq("exercise_id", exerciseId)
      .eq("workouts.status", "completed")
      .not("workouts.completed_at", "is", null)
      .order("completed_at", { referencedTable: "workouts", ascending: false })
      .limit(limit);
    if (error) throw new AIContextFailure("CONTEXT_UNAVAILABLE");
    return this.hydrateSessions(userId, data as WorkoutExerciseContextRow[]);
  }

  async getActiveRecommendation(userId: string, exerciseId: string): Promise<AIRecommendation | null> {
    const { data, error } = await this.client
      .from("progression_recommendations")
      .select("*")
      .eq("user_id", userId)
      .eq("exercise_id", exerciseId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new AIContextFailure("CONTEXT_UNAVAILABLE");
    return data ? mapRecommendation(data) : null;
  }

  async getOwnedRecommendation(
    userId: string,
    recommendationId: string,
  ): Promise<AIRecommendation | null> {
    const { data, error } = await this.client
      .from("progression_recommendations")
      .select("*")
      .eq("id", recommendationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new AIContextFailure("CONTEXT_UNAVAILABLE");
    return data ? mapRecommendation(data) : null;
  }

  async getSourceSession(
    userId: string,
    recommendation: AIRecommendation,
  ): Promise<AIRecentSession | null> {
    if (!recommendation.sourceWorkoutExerciseId) return null;
    const { data, error } = await this.client
      .from("workout_exercises")
      .select(
        "id, workout_id, exercise_id, notes, workouts!workout_exercises_owned_workout_fkey!inner(completed_at, notes, status)",
      )
      .eq("id", recommendation.sourceWorkoutExerciseId)
      .eq("user_id", userId)
      .eq("exercise_id", recommendation.exerciseId)
      .maybeSingle();
    if (error) throw new AIContextFailure("CONTEXT_UNAVAILABLE");
    if (!data) return null;
    const sessions = await this.hydrateSessions(userId, [data as WorkoutExerciseContextRow]);
    return sessions[0] ?? null;
  }

  getTrendMetrics(sessions: readonly AIRecentSession[]): AITrendMetrics {
    const canonicalSessions: ExerciseSessionPerformance[] = sessions.map((session) => ({
      workoutId: session.workoutId,
      completedAt: session.completedAt,
      sets: session.sets.map((set) => ({
        reps: set.reps,
        ...(set.weightKg === undefined ? {} : { weightKg: set.weightKg }),
        ...(set.rpe === undefined ? {} : { rpe: set.rpe as RPE }),
      })),
    }));
    return analyzeExerciseTrend(canonicalSessions);
  }

  private async hydrateSessions(
    userId: string,
    rows: WorkoutExerciseContextRow[],
  ): Promise<AIRecentSession[]> {
    if (rows.length === 0) return [];
    const ids = rows.map(({ id }) => id);
    const { data: sets, error } = await this.client
      .from("sets")
      .select("workout_exercise_id, weight_kg, reps, rpe, notes, position")
      .eq("user_id", userId)
      .eq("set_type", "working")
      .in("workout_exercise_id", ids)
      .order("position", { ascending: true });
    if (error) throw new AIContextFailure("CONTEXT_UNAVAILABLE");

    return rows.flatMap((row) => {
      if (!row.workouts.completed_at) return [];
      return [{
        workoutId: row.workout_id,
        workoutExerciseId: row.id,
        completedAt: row.workouts.completed_at,
        sets: (sets ?? [])
          .filter(({ workout_exercise_id }) => workout_exercise_id === row.id)
          .map((set) => ({
            reps: set.reps,
            ...(set.weight_kg === null ? {} : { weightKg: set.weight_kg }),
            ...(set.rpe === null ? {} : { rpe: set.rpe }),
            ...(set.notes === null ? {} : { notes: set.notes }),
          })),
        ...(row.workouts.notes === null ? {} : { workoutNotes: row.workouts.notes }),
        ...(row.notes === null ? {} : { exerciseNotes: row.notes }),
      }];
    });
  }
}

function jsonStringArray(value: Json | null): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : [];
}

function jsonNumberArray(value: Json | null): number[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === "number")
    ? value
    : undefined;
}

function mapRecommendation(
  row: Database["public"]["Tables"]["progression_recommendations"]["Row"],
): AIRecommendation {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    recommendationType: row.recommendation_type,
    confidence: row.confidence,
    reasonCodes: jsonStringArray(row.reason_codes),
    status: row.status,
    engineVersion: row.engine_version,
    ...(row.source_workout_id === null ? {} : { sourceWorkoutId: row.source_workout_id }),
    ...(row.source_workout_exercise_id === null
      ? {}
      : { sourceWorkoutExerciseId: row.source_workout_exercise_id }),
    ...(row.recommended_weight_kg === null
      ? {}
      : { recommendedWeightKg: row.recommended_weight_kg }),
    ...(row.target_sets === null ? {} : { targetSets: row.target_sets }),
    ...(row.target_min_reps === null ? {} : { targetMinReps: row.target_min_reps }),
    ...(row.target_max_reps === null ? {} : { targetMaxReps: row.target_max_reps }),
    ...(jsonNumberArray(row.target_set_reps) === undefined
      ? {}
      : { targetSetReps: jsonNumberArray(row.target_set_reps) }),
  };
}
