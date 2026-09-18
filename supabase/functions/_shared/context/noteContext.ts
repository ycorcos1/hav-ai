import type { AIRecentSession, ValidatedLocalCurrentSession } from "./types.ts";

export const MAX_AI_NOTE_CHARACTERS = 500;
export const MAX_AI_NOTE_CONTEXT_CHARACTERS = 2_000;
export const MAX_AI_SET_NOTES = 5;

export type SubjectiveNoteContext = {
  authority: "user-authored subjective context";
  exercisePreference?: string;
  workoutNotes: {
    workoutId: string;
    text: string;
  }[];
  setNotes: {
    workoutId: string;
    text: string;
  }[];
};

export function buildMinimizedNoteContext(input: {
  exercisePreferenceNote?: string | null;
  localCurrentSession?: ValidatedLocalCurrentSession;
  recentSessions: readonly AIRecentSession[];
}): SubjectiveNoteContext {
  let remainingCharacters = MAX_AI_NOTE_CONTEXT_CHARACTERS;
  const take = (value?: string | null): string | undefined => {
    const normalized = value?.trim();
    if (!normalized || remainingCharacters <= 0) return undefined;
    const selected = normalized.slice(0, Math.min(MAX_AI_NOTE_CHARACTERS, remainingCharacters));
    remainingCharacters -= selected.length;
    return selected;
  };

  const exercisePreference = take(
    input.localCurrentSession?.exercisePreferenceNotes ?? input.exercisePreferenceNote,
  );
  const workoutNotes: SubjectiveNoteContext["workoutNotes"] = [];
  const setNotes: SubjectiveNoteContext["setNotes"] = [];

  const localWorkoutNote = take(input.localCurrentSession?.workoutNotes);
  if (localWorkoutNote && input.localCurrentSession) {
    workoutNotes.push({ workoutId: input.localCurrentSession.workoutId, text: localWorkoutNote });
  }
  for (const set of input.localCurrentSession?.completedSets ?? []) {
    if (setNotes.length >= MAX_AI_SET_NOTES) break;
    const note = take(set.notes);
    if (note && input.localCurrentSession) {
      setNotes.push({ workoutId: input.localCurrentSession.workoutId, text: note });
    }
  }

  for (const session of input.recentSessions) {
    if (remainingCharacters <= 0) break;
    const workoutNote = take(session.workoutNotes);
    if (workoutNote) workoutNotes.push({ workoutId: session.workoutId, text: workoutNote });
    for (const set of session.sets) {
      if (setNotes.length >= MAX_AI_SET_NOTES) break;
      const note = take(set.notes);
      if (note) setNotes.push({ workoutId: session.workoutId, text: note });
    }
  }

  return {
    authority: "user-authored subjective context",
    ...(exercisePreference ? { exercisePreference } : {}),
    workoutNotes,
    setNotes,
  };
}

export function stripNotesFromSessions(sessions: readonly AIRecentSession[]): AIRecentSession[] {
  return sessions.map((session) => ({
    workoutId: session.workoutId,
    workoutExerciseId: session.workoutExerciseId,
    completedAt: session.completedAt,
    sets: session.sets.map(({ weightKg, reps, rpe }) => ({
      reps,
      ...(weightKg === undefined ? {} : { weightKg }),
      ...(rpe === undefined ? {} : { rpe }),
    })),
  }));
}

