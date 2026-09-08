import type {
  CompleteSetInput,
  CompleteSetResult,
  RPE,
  UUID,
  WorkoutSet,
} from "@/shared/contracts";

import type { SetPersistence } from "./setPersistenceTypes";

export class CompleteSetError extends Error {
  readonly name = "CompleteSetError";
}

type CompleteSetServiceOptions = {
  createId?: () => UUID;
  now?: () => string;
};

export class CompleteSetService {
  private readonly createId: () => UUID;
  private readonly now: () => string;

  constructor(
    private readonly persistence: SetPersistence,
    options: CompleteSetServiceOptions = {},
  ) {
    this.createId = options.createId ?? createUuid;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async complete(userId: UUID, input: CompleteSetInput): Promise<CompleteSetResult> {
    validateInput(input);
    const workout = await this.persistence.workoutRepository.getById(userId, input.workoutId);
    if (!workout || workout.userId !== userId || workout.status !== "active") {
      throw new CompleteSetError("The active workout is not available.");
    }
    const workoutExercise = workout.exercises.find(({ id }) => id === input.workoutExerciseId);
    if (
      !workoutExercise
      || workoutExercise.userId !== userId
      || workoutExercise.workoutId !== workout.id
      || workoutExercise.exerciseId !== input.exerciseId
    ) {
      throw new CompleteSetError("The workout exercise is not available.");
    }

    const existingSets = await this.persistence.setRepository.getForWorkoutExercise(
      userId,
      workoutExercise.id,
    );
    const position = existingSets.reduce(
      (maximum, set) => Math.max(maximum, set.position),
      -1,
    ) + 1;
    const timestamp = this.now();
    const set: WorkoutSet = {
      id: this.createId(),
      userId,
      workoutId: workout.id,
      workoutExerciseId: workoutExercise.id,
      exerciseId: workoutExercise.exerciseId,
      position,
      setType: input.setType,
      ...(input.weightKg === undefined ? {} : { weightKg: input.weightKg }),
      reps: input.reps,
      ...(input.rpe === undefined ? {} : { rpe: input.rpe }),
      ...(input.notes === undefined ? {} : { notes: input.notes }),
      completedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.persistence.commitCompletedSet(set);
    return { set };
  }
}

function validateInput(input: CompleteSetInput): void {
  if (!input.workoutId || !input.workoutExerciseId || !input.exerciseId) {
    throw new CompleteSetError("Set ownership fields are required.");
  }
  if (input.setType !== "working" && input.setType !== "warmup") {
    throw new CompleteSetError("Set type is invalid.");
  }
  if (!Number.isInteger(input.reps) || input.reps <= 0) {
    throw new CompleteSetError("Reps must be a positive whole number.");
  }
  if (
    input.weightKg !== undefined
    && (!Number.isFinite(input.weightKg) || input.weightKg < 0)
  ) {
    throw new CompleteSetError("Weight must be a non-negative number.");
  }
  if (input.rpe !== undefined && !validRpeValues.includes(input.rpe)) {
    throw new CompleteSetError("RPE must be between 6 and 10 in 0.5 increments.");
  }
}

const validRpeValues: readonly RPE[] = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

function createUuid(): UUID {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}
