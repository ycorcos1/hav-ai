import type { LocalSetRepository } from "@/db/repositories/types";
import type { Workout, WorkoutExercise, WorkoutSet } from "@/shared/contracts";

import { browserWebPreviewStorage, type WebPreviewStorage } from "./storage";
import {
  enqueueWorkoutWebPreviewDelete,
  removeWorkoutWebPreviewMutation,
  readWorkoutWebPreviewState,
  writeWorkoutWebPreviewState,
  type WorkoutWebPreviewState,
} from "./workoutStorage";

export class WebPreviewLocalSetRepository implements LocalSetRepository {
  constructor(private readonly storage: WebPreviewStorage = browserWebPreviewStorage()) {}

  async getById(userId: string, id: string): Promise<WorkoutSet | null> {
    const found = findVisibleSet(readWorkoutWebPreviewState(this.storage), id);
    return found?.set.userId === userId ? found.set : null;
  }

  async getForWorkoutExercise(userId: string, workoutExerciseId: string): Promise<WorkoutSet[]> {
    const state = readWorkoutWebPreviewState(this.storage);
    const parent = findWorkoutExercise(state, userId, workoutExerciseId);
    return parent
      ? [...parent.exercise.sets].sort((left, right) => left.position - right.position)
      : [];
  }

  async create(set: WorkoutSet): Promise<void> {
    this.save(set);
  }

  async update(set: WorkoutSet): Promise<void> {
    this.save(set);
  }

  async deleteOrTombstone(userId: string, id: string): Promise<void> {
    const state = readWorkoutWebPreviewState(this.storage);
    deleteWorkoutSetInPreviewState(state, userId, id, new Date().toISOString());
    writeWorkoutWebPreviewState(this.storage, state);
  }

  private save(set: WorkoutSet): void {
    const state = readWorkoutWebPreviewState(this.storage);
    saveWorkoutSetInPreviewState(state, set);
    writeWorkoutWebPreviewState(this.storage, state);
  }
}

export function saveWorkoutSetInPreviewState(
  state: WorkoutWebPreviewState,
  set: WorkoutSet,
): void {
  const existing = findVisibleSet(state, set.id);
  if (existing && existing.set.userId !== set.userId) {
    throw new Error("Set ancestry is not accessible to its user.");
  }

  const parent = findWorkoutExercise(state, set.userId, set.workoutExerciseId);
  if (
    !parent
    || parent.workout.id !== set.workoutId
    || parent.exercise.exerciseId !== set.exerciseId
  ) {
    throw new Error("Set ancestry is not accessible to its user.");
  }

  const index = parent.exercise.sets.findIndex(({ id }) => id === set.id);
  if (index >= 0) parent.exercise.sets[index] = set;
  else {
    parent.exercise.sets.push(set);
    state.setSyncMetadata[set.id] ??= { cloudKnown: false };
  }
  state.deletedSets = state.deletedSets.filter(({ id }) => id !== set.id);
}

export type WebPreviewSetDeleteResult = "deleted-local" | "missing" | "tombstoned";

export function deleteWorkoutSetInPreviewState(
  state: WorkoutWebPreviewState,
  userId: string,
  id: string,
  deletedAt: string,
): WebPreviewSetDeleteResult {
  const found = findVisibleSet(state, id);
  if (!found) return "missing";
  if (found.set.userId !== userId) {
    throw new Error("Set ancestry is not accessible to its user.");
  }

  found.exercise.sets = found.exercise.sets.filter((set) => set.id !== id);
  if (!state.setSyncMetadata[id]?.cloudKnown) {
    delete state.setSyncMetadata[id];
    removeWorkoutWebPreviewMutation(state, "set", id);
    return "deleted-local";
  }

  state.deletedSets = state.deletedSets.filter((set) => set.id !== id);
  state.deletedSets.push({ ...found.set, updatedAt: deletedAt });
  enqueueWorkoutWebPreviewDelete(state, "set", id, deletedAt);
  return "tombstoned";
}

type FoundWorkoutExercise = {
  exercise: WorkoutExercise;
  workout: Workout;
};

function findWorkoutExercise(
  state: WorkoutWebPreviewState,
  userId: string,
  workoutExerciseId: string,
): FoundWorkoutExercise | undefined {
  for (const workout of state.workouts) {
    if (workout.userId !== userId) continue;
    const exercise = workout.exercises.find(({ id }) => id === workoutExerciseId);
    if (exercise?.userId === userId) return { exercise, workout };
  }
  return undefined;
}

function findVisibleSet(
  state: WorkoutWebPreviewState,
  id: string,
): (FoundWorkoutExercise & { set: WorkoutSet }) | undefined {
  for (const workout of state.workouts) {
    for (const exercise of workout.exercises) {
      const set = exercise.sets.find((candidate) => candidate.id === id);
      if (set) return { exercise, set, workout };
    }
  }
  return undefined;
}
