import type { LocalUserExercisePreferenceRepository } from '@/db/repositories';
import type { Exercise, UserExercisePreference } from '@/shared/contracts';

import { saveExercisePreference } from '@/features/exercises/services/exercisePreferences';

const exercise: Exercise = { id: 'e-1', name: 'Bench', primaryMuscleGroup: 'chest', secondaryMuscleGroups: [], equipmentType: 'barbell', measurementType: 'weight_reps', isSystem: true, isArchived: false, createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z' };
const base: UserExercisePreference = { id: 'p-1', userId: 'u-1', exerciseId: 'e-1', isFavorite: true, notes: 'Seat 4', restDurationSeconds: 120, createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z' };

function repository(): jest.Mocked<LocalUserExercisePreferenceRepository> {
  return { get: jest.fn(), listFavorites: jest.fn(), upsert: jest.fn(), deleteOrTombstone: jest.fn() };
}

describe('exercise preference service', () => {
  it('persists favorite, note, and rest changes as one local preference row', async () => {
    const repo = repository(); repo.get.mockResolvedValue(base);
    const result = await saveExercisePreference(repo, 'u-1', exercise, { isFavorite: false, notes: 'Updated', restDurationSeconds: 90 }, base.updatedAt);
    expect(result).toMatchObject({ isFavorite: false, notes: 'Updated', restDurationSeconds: 90 });
    expect(repo.upsert).toHaveBeenCalledWith(result);
  });

  it('rejects zero, negative, and non-integer rest overrides', async () => {
    const repo = repository();
    for (const value of [0, -1, 12.5]) await expect(saveExercisePreference(repo, 'u-1', exercise, { restDurationSeconds: value })).rejects.toThrow('positive whole number');
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('clears the preference row when all optional preferences are removed', async () => {
    const repo = repository(); repo.get.mockResolvedValue(base);
    await expect(saveExercisePreference(repo, 'u-1', exercise, { isFavorite: false, notes: null, restDurationSeconds: null })).resolves.toBeNull();
    expect(repo.deleteOrTombstone).toHaveBeenCalledWith('u-1', 'p-1');
    expect(repo.upsert).not.toHaveBeenCalled();
  });
});
