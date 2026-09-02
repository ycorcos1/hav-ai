import type {
  LocalRecommendationRepository,
  LocalTemplateRepository,
  LocalWorkoutRepository,
} from "@/db/repositories";
import type { UUID, Workout, WorkoutExercise } from "@/shared/contracts";

export type StartWorkoutDependencies = {
  recommendationRepository: LocalRecommendationRepository;
  templateRepository: LocalTemplateRepository;
  workoutRepository: LocalWorkoutRepository;
};

export class StartWorkoutError extends Error {
  readonly name = "StartWorkoutError";
}

export type StartWorkoutResult =
  | { status: "started"; workout: Workout }
  | {
    activeWorkout: Workout;
    options: readonly ["resume", "discard", "cancel"];
    requestedTemplateId: UUID;
    status: "active_workout_exists";
  };

export class StartWorkoutService {
  constructor(private readonly dependencies: StartWorkoutDependencies) {}

  async requestStartFromTemplate(
    userId: UUID,
    templateId: UUID,
    now: string = new Date().toISOString(),
  ): Promise<StartWorkoutResult> {
    const active = await this.dependencies.workoutRepository.getActiveForUser(userId);
    if (active) return activeWorkoutResult(active, templateId);
    try {
      return { status: "started", workout: await this.startFromTemplate(userId, templateId, now) };
    } catch (cause) {
      const concurrentActive = await this.dependencies.workoutRepository.getActiveForUser(userId);
      if (concurrentActive) return activeWorkoutResult(concurrentActive, templateId);
      throw cause;
    }
  }

  async discardActiveWorkout(
    userId: UUID,
    workoutId: UUID,
    now: string = new Date().toISOString(),
  ): Promise<void> {
    const active = await this.dependencies.workoutRepository.getActiveForUser(userId);
    if (!active || active.id !== workoutId) {
      throw new StartWorkoutError("The active workout could not be discarded.");
    }
    await this.dependencies.workoutRepository.update({
      ...active,
      status: "discarded",
      updatedAt: now,
    });
  }

  async startFromTemplate(
    userId: UUID,
    templateId: UUID,
    now: string = new Date().toISOString(),
  ): Promise<Workout> {
    const template = await this.dependencies.templateRepository.getById(userId, templateId);
    if (!template || template.isArchived) {
      throw new StartWorkoutError("This workout template is not available.");
    }

    const workoutId = createUuid();
    const exercises: WorkoutExercise[] = [];
    for (const templateExercise of [...template.exercises].sort((left, right) => left.position - right.position)) {
      const recommendation = await this.dependencies.recommendationRepository.getActiveForExercise(
        userId,
        templateExercise.exerciseId,
      );
      exercises.push({
        id: createUuid(),
        userId,
        workoutId,
        exerciseId: templateExercise.exerciseId,
        position: exercises.length,
        targetSets: recommendation?.targetSets ?? templateExercise.targetSets,
        targetMinReps: recommendation?.targetMinReps ?? templateExercise.targetMinReps,
        targetMaxReps: recommendation?.targetMaxReps ?? templateExercise.targetMaxReps,
        ...(recommendation?.recommendedWeightKg !== undefined
          ? { targetWeightKg: recommendation.recommendedWeightKg }
          : {}),
        ...(recommendation ? { sourceRecommendationId: recommendation.id } : {}),
        sets: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    const workout: Workout = {
      id: workoutId,
      userId,
      sourceTemplateId: template.id,
      name: template.name,
      status: "active",
      startedAt: now,
      exercises,
      createdAt: now,
      updatedAt: now,
    };
    await this.dependencies.workoutRepository.create(workout);
    return workout;
  }
}

function activeWorkoutResult(activeWorkout: Workout, requestedTemplateId: UUID): StartWorkoutResult {
  return {
    activeWorkout,
    options: ["resume", "discard", "cancel"],
    requestedTemplateId,
    status: "active_workout_exists",
  };
}

function createUuid(): UUID {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}
