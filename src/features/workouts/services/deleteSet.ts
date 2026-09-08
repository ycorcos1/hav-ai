import type { UUID } from "@/shared/contracts";

import type { SetDeleteResult, SetPersistence } from "./setPersistenceTypes";

export class DeleteSetError extends Error {
  readonly name = "DeleteSetError";
}

type DeleteSetServiceOptions = {
  now?: () => string;
};

export class DeleteSetService {
  private readonly now: () => string;

  constructor(
    private readonly persistence: SetPersistence,
    options: DeleteSetServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async delete(userId: UUID, setId: UUID): Promise<SetDeleteResult> {
    const set = await this.persistence.setRepository.getById(userId, setId);
    if (!set) throw new DeleteSetError("The completed set is no longer available.");

    const workout = await this.persistence.workoutRepository.getById(userId, set.workoutId);
    const workoutExercise = workout?.exercises.find(({ id }) => id === set.workoutExerciseId);
    if (
      !workout
      || workout.status !== "active"
      || !workoutExercise
      || workoutExercise.userId !== userId
      || workoutExercise.exerciseId !== set.exerciseId
    ) {
      throw new DeleteSetError("The active workout set is not available.");
    }

    const result = await this.persistence.deleteCompletedSet(userId, setId, this.now());
    if (result === "missing") {
      throw new DeleteSetError("The completed set is no longer available.");
    }
    return result;
  }
}
