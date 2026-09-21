import type {
  LocalExerciseRepository,
  LocalWorkoutRepository,
} from "@/db/repositories";
import type { UUID, Workout, WorkoutExercise } from "@/shared/contracts";

export type ActiveWorkoutStructureRepository = LocalWorkoutRepository & {
  updateActiveWorkoutStructure(workout: Workout, removedExerciseId?: UUID): Promise<void>;
};

type Dependencies = {
  exerciseRepository: LocalExerciseRepository;
  workoutRepository: ActiveWorkoutStructureRepository;
};

export class ActiveWorkoutMutationError extends Error {
  readonly name = "ActiveWorkoutMutationError";
}

export class ActiveWorkoutMutationService {
  constructor(
    private readonly dependencies: Dependencies,
    private readonly now: () => string = () => new Date().toISOString(),
    private readonly createId: () => UUID = createUuid,
  ) {}

  async addExercise(userId: UUID, workoutId: UUID, exerciseId: UUID): Promise<Workout> {
    const [workout, exercise] = await Promise.all([
      this.dependencies.workoutRepository.getById(userId, workoutId),
      this.dependencies.exerciseRepository.getById(userId, exerciseId),
    ]);
    if (!workout || workout.status !== "active" || !exercise || exercise.isArchived) {
      throw mutationError();
    }
    const timestamp = this.now();
    const workoutExercise: WorkoutExercise = {
      id: this.createId(),
      userId,
      workoutId,
      exerciseId,
      position: workout.exercises.length,
      sets: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const updated = {
      ...workout,
      exercises: [...ordered(workout.exercises), workoutExercise],
      updatedAt: timestamp,
    };
    await this.dependencies.workoutRepository.updateActiveWorkoutStructure(updated);
    return updated;
  }

  async removeExercise(
    userId: UUID,
    workoutId: UUID,
    workoutExerciseId: UUID,
  ): Promise<Workout> {
    const workout = await this.requireActiveWorkout(userId, workoutId);
    if (!workout.exercises.some(({ id }) => id === workoutExerciseId)) throw mutationError();
    const timestamp = this.now();
    const exercises = ordered(workout.exercises)
      .filter(({ id }) => id !== workoutExerciseId)
      .map((exercise, position) => ({ ...exercise, position, updatedAt: timestamp }));
    const updated = { ...workout, exercises, updatedAt: timestamp };
    await this.dependencies.workoutRepository.updateActiveWorkoutStructure(
      updated,
      workoutExerciseId,
    );
    return updated;
  }

  async moveExercise(
    userId: UUID,
    workoutId: UUID,
    workoutExerciseId: UUID,
    direction: "down" | "up",
  ): Promise<Workout> {
    const workout = await this.requireActiveWorkout(userId, workoutId);
    const exercises = ordered(workout.exercises);
    const index = exercises.findIndex(({ id }) => id === workoutExerciseId);
    const destination = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || destination < 0 || destination >= exercises.length) throw mutationError();
    [exercises[index], exercises[destination]] = [exercises[destination], exercises[index]];
    const timestamp = this.now();
    const updated = {
      ...workout,
      exercises: exercises.map((exercise, position) => ({ ...exercise, position, updatedAt: timestamp })),
      updatedAt: timestamp,
    };
    await this.dependencies.workoutRepository.updateActiveWorkoutStructure(updated);
    return updated;
  }

  private async requireActiveWorkout(userId: UUID, workoutId: UUID): Promise<Workout> {
    const workout = await this.dependencies.workoutRepository.getById(userId, workoutId);
    if (!workout || workout.status !== "active") throw mutationError();
    return workout;
  }
}

function ordered(exercises: readonly WorkoutExercise[]): WorkoutExercise[] {
  return [...exercises].sort((left, right) => left.position - right.position);
}

function mutationError(): ActiveWorkoutMutationError {
  return new ActiveWorkoutMutationError("The active workout could not be changed.");
}

function createUuid(): UUID {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}
