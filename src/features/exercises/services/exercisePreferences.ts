import type { LocalUserExercisePreferenceRepository } from '@/db/repositories';
import type { Exercise, UserExercisePreference, UUID } from '@/shared/contracts';

export type ExercisePreferencePatch = Partial<Pick<UserExercisePreference, 'isFavorite'>> & { notes?: string | null; restDurationSeconds?: number | null };

export function validateRestDuration(seconds: number): void {
  if (!Number.isInteger(seconds) || seconds <= 0) throw new Error('Rest duration must be a positive whole number.');
}

export async function saveExercisePreference(
  repository: LocalUserExercisePreferenceRepository,
  userId: UUID,
  exercise: Exercise,
  patch: ExercisePreferencePatch,
  now: string = new Date().toISOString(),
): Promise<UserExercisePreference | null> {
  if (patch.restDurationSeconds !== undefined && patch.restDurationSeconds !== null) validateRestDuration(patch.restDurationSeconds);
  const current = await repository.get(userId, exercise.id);
  const next = {
    isFavorite: patch.isFavorite ?? current?.isFavorite ?? false,
    notes: patch.notes === null ? undefined : patch.notes?.trim() || current?.notes,
    restDurationSeconds: patch.restDurationSeconds === null ? undefined : patch.restDurationSeconds ?? current?.restDurationSeconds,
  } satisfies ExercisePreferencePatch;
  if (!next.isFavorite && !next.notes && next.restDurationSeconds === undefined) {
    if (current) await repository.deleteOrTombstone(userId, current.id);
    return null;
  }
  const preference: UserExercisePreference = {
    id: current?.id ?? createUuid(),
    userId,
    exerciseId: exercise.id,
    isFavorite: next.isFavorite ?? false,
    ...(next.notes ? { notes: next.notes } : {}),
    ...(next.restDurationSeconds !== undefined ? { restDurationSeconds: next.restDurationSeconds } : {}),
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
  };
  await repository.upsert(preference);
  return preference;
}

function createUuid(): UUID {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}
