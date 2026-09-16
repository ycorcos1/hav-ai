import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { CachedRecentExerciseSession } from "@/db/repositories";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { rpeSchema } from "@/shared/schemas";

import {
  RemoteExerciseHistoryRepositoryError,
  type RemoteExerciseHistoryRepository,
} from "./RemoteExerciseHistoryRepository";

type WorkoutRow = Database["public"]["Tables"]["workouts"]["Row"];
type WorkoutExerciseRow = Database["public"]["Tables"]["workout_exercises"]["Row"];
type SetRow = Database["public"]["Tables"]["sets"]["Row"];

export class SupabaseRemoteExerciseHistoryRepository
implements RemoteExerciseHistoryRepository {
  constructor(private readonly client: SupabaseClient<Database> = supabase) {}

  async fetchOwnCompletedSessions(): Promise<CachedRecentExerciseSession[]> {
    const user = await this.requireUser();
    const sessions: CachedRecentExerciseSession[] = [];
    for (let offset = 0; ; offset += workoutPageSize) {
      const workoutResult = await this.client.from("workouts")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .range(offset, offset + workoutPageSize - 1);
      if (workoutResult.error) throw repositoryError();
      assertOwned(workoutResult.data, user.id);

      const workoutIds = workoutResult.data.map(({ id }) => id);
      if (workoutIds.length > 0) {
        const [exercises, sets] = await Promise.all([
          this.fetchWorkoutExercises(user.id, workoutIds),
          this.fetchWorkingSets(user.id, workoutIds),
        ]);
        try {
          sessions.push(...mapSessions(workoutResult.data, exercises, sets));
        } catch {
          throw repositoryError();
        }
      }
      if (workoutResult.data.length < workoutPageSize) return sessions;
    }
  }

  private async fetchWorkoutExercises(
    userId: string,
    workoutIds: string[],
  ): Promise<WorkoutExerciseRow[]> {
    const rows: WorkoutExerciseRow[] = [];
    for (let offset = 0; ; offset += childPageSize) {
      const result = await this.client.from("workout_exercises")
        .select("*")
        .eq("user_id", userId)
        .in("workout_id", workoutIds)
        .order("position")
        .range(offset, offset + childPageSize - 1);
      if (result.error) throw repositoryError();
      assertOwned(result.data, userId);
      rows.push(...result.data);
      if (result.data.length < childPageSize) return rows;
    }
  }

  private async fetchWorkingSets(userId: string, workoutIds: string[]): Promise<SetRow[]> {
    const rows: SetRow[] = [];
    for (let offset = 0; ; offset += childPageSize) {
      const result = await this.client.from("sets")
        .select("*")
        .eq("user_id", userId)
        .in("workout_id", workoutIds)
        .eq("set_type", "working")
        .order("position")
        .range(offset, offset + childPageSize - 1);
      if (result.error) throw repositoryError();
      assertOwned(result.data, userId);
      rows.push(...result.data);
      if (result.data.length < childPageSize) return rows;
    }
  }

  private async requireUser(): Promise<User> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) throw repositoryError();
    return data.user;
  }
}

function mapSessions(
  workouts: WorkoutRow[],
  exercises: WorkoutExerciseRow[],
  sets: SetRow[],
): CachedRecentExerciseSession[] {
  const workoutsById = new Map(workouts.map((workout) => [workout.id, workout]));
  const sessions = new Map<string, CachedRecentExerciseSession>();
  exercises.forEach((exercise) => {
    const workout = workoutsById.get(exercise.workout_id);
    if (!workout?.completed_at) throw repositoryError();
    const workingSets = sets
      .filter(({ workout_exercise_id: workoutExerciseId }) => workoutExerciseId === exercise.id)
      .sort((left, right) => left.position - right.position);
    if (workingSets.length === 0) return;
    const mappedSets: CachedRecentExerciseSession["workingSets"] = workingSets.map((set) => ({
      ...(set.weight_kg !== null ? { weightKg: set.weight_kg } : {}),
      reps: set.reps,
      ...(set.rpe !== null ? { rpe: rpeSchema.parse(set.rpe) } : {}),
    }));
    const key = `${exercise.workout_id}:${exercise.exercise_id}`;
    const existing = sessions.get(key);
    if (existing) {
      sessions.set(key, {
        ...existing,
        workingSets: [...existing.workingSets, ...mappedSets],
        serverUpdatedAt: latestTimestamp([
          existing.serverUpdatedAt ?? exercise.updated_at,
          exercise.updated_at,
          ...workingSets.map(({ updated_at: updatedAt }) => updatedAt),
        ]),
      });
      return;
    }
    sessions.set(key, {
      id: exercise.id,
      userId: exercise.user_id,
      exerciseId: exercise.exercise_id,
      workoutId: exercise.workout_id,
      completedAt: workout.completed_at,
      targetSets: exercise.target_sets ?? undefined,
      targetMinReps: exercise.target_min_reps ?? undefined,
      targetMaxReps: exercise.target_max_reps ?? undefined,
      workingSets: mappedSets,
      serverUpdatedAt: latestTimestamp([
        workout.updated_at,
        exercise.updated_at,
        ...workingSets.map(({ updated_at: updatedAt }) => updatedAt),
      ]),
    });
  });
  return [...sessions.values()];
}

function assertOwned(rows: { user_id: string }[], userId: string): void {
  if (rows.some(({ user_id: ownerUserId }) => ownerUserId !== userId)) {
    throw repositoryError();
  }
}

function latestTimestamp(values: string[]): string {
  return [...values].sort((left, right) => right.localeCompare(left))[0];
}

const workoutPageSize = 100;
const childPageSize = 1000;

function repositoryError(): RemoteExerciseHistoryRepositoryError {
  return new RemoteExerciseHistoryRepositoryError();
}
