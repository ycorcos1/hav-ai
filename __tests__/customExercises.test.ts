import type { LocalExerciseRepository } from '@/db/repositories';
import type { Exercise } from '@/shared/contracts';

import { archiveCustomExercise, createCustomExercise, updateCustomExercise } from '@/features/exercises/services/customExercises';
import type { CustomExerciseInput } from '@/features/exercises/services/customExercises';

const userId = '30000000-0000-4000-8000-000000000001';
const existing: Exercise = {
  id: '40000000-0000-4000-8000-000000000001',
  ownerUserId: userId,
  name: 'Custom Row',
  primaryMuscleGroup: 'back',
  secondaryMuscleGroups: [],
  equipmentType: 'cable',
  measurementType: 'weight_reps',
  isSystem: false,
  isArchived: false,
  createdAt: '2026-08-30T00:00:00.000Z',
  updatedAt: '2026-08-30T00:00:00.000Z',
};
const input: CustomExerciseInput = {
  name: existing.name,
  primaryMuscleGroup: existing.primaryMuscleGroup,
  secondaryMuscleGroups: existing.secondaryMuscleGroups,
  equipmentType: existing.equipmentType,
  measurementType: existing.measurementType,
};

function repository(): jest.Mocked<LocalExerciseRepository> {
  return { getById: jest.fn(), listAccessible: jest.fn(), search: jest.fn(), upsert: jest.fn(), archiveCustomExercise: jest.fn() };
}

describe('custom exercise services', () => {
  it('creates an owned local exercise with a UUID', async () => {
    const repo = repository();
    const created = await createCustomExercise(repo, userId, input, existing.createdAt);
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.isSystem).toBe(false);
    expect(created.ownerUserId).toBe(userId);
    expect(repo.upsert).toHaveBeenCalledWith(created);
  });

  it('only updates and archives the owning custom exercise', async () => {
    const repo = repository();
    repo.getById.mockResolvedValue(existing);
    const updated = await updateCustomExercise(repo, userId, existing.id, input, '2026-08-31T00:00:00.000Z');
    expect(updated.updatedAt).toBe('2026-08-31T00:00:00.000Z');
    await archiveCustomExercise(repo, userId, existing.id);
    expect(repo.archiveCustomExercise).toHaveBeenCalledWith(userId, existing.id);
  });

  it('rejects system exercise edits', async () => {
    const repo = repository();
    repo.getById.mockResolvedValue({ ...existing, isSystem: true, ownerUserId: undefined });
    await expect(updateCustomExercise(repo, userId, existing.id, input)).rejects.toThrow('Only active custom exercises can be edited.');
  });
});
