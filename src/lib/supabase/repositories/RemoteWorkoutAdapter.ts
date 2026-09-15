import type {
  RemoteMutationResult,
  UUID,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from "@/shared/contracts";

export interface RemoteWorkoutAdapter {
  deleteOwnSet(id: UUID): Promise<void>;
  upsertOwnSet(set: WorkoutSet): Promise<RemoteMutationResult>;
  upsertOwnWorkout(workout: Workout): Promise<RemoteMutationResult>;
  upsertOwnWorkoutExercise(exercise: WorkoutExercise): Promise<RemoteMutationResult>;
}

export type RemoteWorkoutAdapterOperation =
  | "deleteOwnSet"
  | "upsertOwnSet"
  | "upsertOwnWorkout"
  | "upsertOwnWorkoutExercise";

export class RemoteWorkoutAdapterError extends Error {
  readonly code = "REMOTE_WORKOUT_ADAPTER_ERROR";

  constructor(readonly operation: RemoteWorkoutAdapterOperation) {
    super(`Remote workout operation failed: ${operation}.`);
    this.name = "RemoteWorkoutAdapterError";
  }
}
