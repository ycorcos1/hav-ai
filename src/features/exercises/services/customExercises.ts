import type { LocalExerciseRepository } from '@/db/repositories';
import type {
  EquipmentType,
  Exercise,
  MeasurementType,
  MuscleGroup,
  UUID,
} from '@/shared/contracts';

export type CustomExerciseInput = {
  name: string;
  primaryMuscleGroup: MuscleGroup;
  secondaryMuscleGroups: MuscleGroup[];
  equipmentType: EquipmentType;
  measurementType: MeasurementType;
};

export function validateCustomExerciseInput(input: CustomExerciseInput): string | null {
  if (!input.name.trim()) return 'Enter an exercise name.';
  if (input.name.trim().length > 80) return 'Exercise names must be 80 characters or fewer.';
  return null;
}

export async function createCustomExercise(
  repository: LocalExerciseRepository,
  userId: UUID,
  input: CustomExerciseInput,
  now: string = new Date().toISOString(),
): Promise<Exercise> {
  const error = validateCustomExerciseInput(input);
  if (error) throw new Error(error);

  const exercise: Exercise = {
    ...input,
    id: createUuid(),
    ownerUserId: userId,
    name: input.name.trim(),
    isSystem: false,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };
  await repository.upsert(exercise);
  return exercise;
}

function createUuid(): UUID {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export async function updateCustomExercise(
  repository: LocalExerciseRepository,
  userId: UUID,
  id: UUID,
  input: CustomExerciseInput,
  now: string = new Date().toISOString(),
): Promise<Exercise> {
  const current = await repository.getById(userId, id);
  if (!current || current.isSystem || current.ownerUserId !== userId || current.isArchived) {
    throw new Error('Only active custom exercises can be edited.');
  }
  const error = validateCustomExerciseInput(input);
  if (error) throw new Error(error);

  const exercise: Exercise = { ...current, ...input, name: input.name.trim(), updatedAt: now };
  await repository.upsert(exercise);
  return exercise;
}

export async function archiveCustomExercise(
  repository: LocalExerciseRepository,
  userId: UUID,
  id: UUID,
): Promise<void> {
  const current = await repository.getById(userId, id);
  if (!current || current.isSystem || current.ownerUserId !== userId) {
    throw new Error('Only user-created exercises can be archived.');
  }
  await repository.archiveCustomExercise(userId, id);
}
