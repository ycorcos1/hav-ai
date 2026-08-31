import type {
  LocalExerciseRepository,
  LocalTemplateRepository,
} from "@/db/repositories/types";
import type {
  UUID,
  WorkoutTemplate,
  WorkoutTemplateExercise,
} from "@/shared/contracts";

export type TemplateExerciseInput = {
  exerciseId: UUID;
  id?: UUID;
  notes?: string;
  targetMaxReps: number;
  targetMinReps: number;
  targetSets: number;
};

export type SaveTemplateInput = {
  exercises: TemplateExerciseInput[];
  name: string;
  notes?: string;
};

export type TemplateServiceDependencies = {
  exerciseRepository: LocalExerciseRepository;
  templateRepository: LocalTemplateRepository;
};

export class TemplateValidationError extends Error {
  readonly name = "TemplateValidationError";
}

export class TemplateService {
  constructor(private readonly dependencies: TemplateServiceDependencies) {}

  async create(
    userId: UUID,
    input: SaveTemplateInput,
    now: string = new Date().toISOString(),
  ): Promise<WorkoutTemplate> {
    const id = createUuid();
    const template = await this.buildTemplate(userId, id, input, now, now);
    await this.dependencies.templateRepository.create(template);
    return template;
  }

  async edit(
    userId: UUID,
    id: UUID,
    input: SaveTemplateInput,
    now: string = new Date().toISOString(),
  ): Promise<WorkoutTemplate> {
    const current = await this.requireOwned(userId, id);
    const template = await this.buildTemplate(userId, id, input, current.createdAt, now);
    await this.dependencies.templateRepository.update(template);
    return template;
  }

  async duplicate(
    userId: UUID,
    id: UUID,
    now: string = new Date().toISOString(),
  ): Promise<WorkoutTemplate> {
    const current = await this.requireOwned(userId, id);
    return this.create(userId, {
      name: current.name,
      ...(current.notes ? { notes: current.notes } : {}),
      exercises: current.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        targetSets: exercise.targetSets,
        targetMinReps: exercise.targetMinReps,
        targetMaxReps: exercise.targetMaxReps,
        ...(exercise.notes ? { notes: exercise.notes } : {}),
      })),
    }, now);
  }

  async archive(userId: UUID, id: UUID): Promise<void> {
    await this.requireOwned(userId, id);
    await this.dependencies.templateRepository.archive(userId, id);
  }

  get(userId: UUID, id: UUID): Promise<WorkoutTemplate | null> {
    return this.dependencies.templateRepository.getById(userId, id);
  }

  async list(userId: UUID): Promise<WorkoutTemplate[]> {
    const templates = await this.dependencies.templateRepository.listForUser(userId);
    return templates.filter((template) => !template.isArchived);
  }

  private async requireOwned(userId: UUID, id: UUID): Promise<WorkoutTemplate> {
    const template = await this.get(userId, id);
    if (!template) throw new TemplateValidationError("Template not found.");
    return template;
  }

  private async buildTemplate(
    userId: UUID,
    templateId: UUID,
    input: SaveTemplateInput,
    createdAt: string,
    updatedAt: string,
  ): Promise<WorkoutTemplate> {
    const name = input.name.trim();
    if (!name) throw new TemplateValidationError("Enter a workout name.");
    if (input.exercises.length === 0) {
      throw new TemplateValidationError("Add at least one exercise.");
    }

    const exercises: WorkoutTemplateExercise[] = [];
    for (const [position, exercise] of input.exercises.entries()) {
      validateExerciseConfiguration(exercise);
      const accessible = await this.dependencies.exerciseRepository.getById(
        userId,
        exercise.exerciseId,
      );
      if (!accessible || accessible.isArchived) {
        throw new TemplateValidationError("A selected exercise is not available.");
      }
      exercises.push({
        id: exercise.id ?? createUuid(),
        userId,
        templateId,
        exerciseId: exercise.exerciseId,
        position,
        targetSets: exercise.targetSets,
        targetMinReps: exercise.targetMinReps,
        targetMaxReps: exercise.targetMaxReps,
        ...(cleanOptionalText(exercise.notes) ? { notes: cleanOptionalText(exercise.notes) } : {}),
        createdAt,
        updatedAt,
      });
    }

    return {
      id: templateId,
      userId,
      name,
      ...(cleanOptionalText(input.notes) ? { notes: cleanOptionalText(input.notes) } : {}),
      isArchived: false,
      exercises,
      createdAt,
      updatedAt,
    };
  }
}

export function validateExerciseConfiguration(input: TemplateExerciseInput): void {
  if (!Number.isInteger(input.targetSets) || input.targetSets <= 0) {
    throw new TemplateValidationError("Target sets must be a positive whole number.");
  }
  if (!Number.isInteger(input.targetMinReps) || input.targetMinReps <= 0) {
    throw new TemplateValidationError("Minimum reps must be a positive whole number.");
  }
  if (!Number.isInteger(input.targetMaxReps) || input.targetMaxReps < input.targetMinReps) {
    throw new TemplateValidationError("Maximum reps must be at least minimum reps.");
  }
}

function cleanOptionalText(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

function createUuid(): UUID {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}
