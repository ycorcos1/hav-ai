import type { EditSetInput, UUID, WorkoutSet } from "@/shared/contracts";

import type { SetPersistence } from "./setPersistenceTypes";
import { validateSetValues } from "./setValidation";

export class EditSetError extends Error {
  readonly name = "EditSetError";
}

type EditSetServiceOptions = {
  now?: () => string;
};

export class EditSetService {
  private readonly now: () => string;

  constructor(
    private readonly persistence: SetPersistence,
    options: EditSetServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async edit(userId: UUID, input: EditSetInput): Promise<WorkoutSet> {
    try {
      validateSetValues(input);
    } catch (error: unknown) {
      throw new EditSetError(error instanceof Error ? error.message : "Set values are invalid.");
    }
    const existing = await this.persistence.setRepository.getById(userId, input.setId);
    if (!existing) throw new EditSetError("The completed set is no longer available.");

    const workout = await this.persistence.workoutRepository.getById(userId, existing.workoutId);
    const workoutExercise = workout?.exercises.find(({ id }) => id === existing.workoutExerciseId);
    if (
      !workout
      || workout.status !== "active"
      || !workoutExercise
      || workoutExercise.userId !== userId
      || workoutExercise.exerciseId !== existing.exerciseId
    ) {
      throw new EditSetError("The active workout set is not available.");
    }

    const edited: WorkoutSet = {
      id: existing.id,
      userId: existing.userId,
      workoutId: existing.workoutId,
      workoutExerciseId: existing.workoutExerciseId,
      exerciseId: existing.exerciseId,
      position: existing.position,
      setType: existing.setType,
      ...(input.weightKg === undefined ? {} : { weightKg: input.weightKg }),
      reps: input.reps,
      ...(input.rpe === undefined ? {} : { rpe: input.rpe }),
      ...(existing.notes === undefined ? {} : { notes: existing.notes }),
      completedAt: existing.completedAt,
      createdAt: existing.createdAt,
      updatedAt: this.now(),
    };
    await this.persistence.commitEditedSet(edited);
    return edited;
  }
}
