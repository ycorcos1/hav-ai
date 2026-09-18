import { AIContextFailure } from "./errors.ts";
import {
  buildMinimizedNoteContext,
  stripNotesFromSessions,
  type SubjectiveNoteContext,
} from "./noteContext.ts";
import type {
  AIExercise,
  AIProfilePreferences,
  AIRecentSession,
  AIRecommendation,
  AITrendMetrics,
  CoachContextDataSource,
  ValidatedLocalCurrentSession,
} from "./types.ts";

export const COACH_RECENT_SESSION_LIMIT = 5;

export type CoachContext = {
  authority: {
    structuredWorkoutFacts: "authoritative";
    userAuthoredNotes: "subjective";
    aiInterpretation: "advisory";
  };
  userPreferences: AIProfilePreferences;
  exercise?: AIExercise;
  recentSessions: AIRecentSession[];
  currentRecommendation?: AIRecommendation;
  trendMetrics?: AITrendMetrics;
  subjectiveNotes: SubjectiveNoteContext;
  localCurrentSession?: ValidatedLocalCurrentSession;
};

export async function buildCoachContext(input: {
  userId: string;
  activeWorkoutId?: string;
  exerciseId?: string;
  localCurrentSession?: ValidatedLocalCurrentSession;
  dataSource: CoachContextDataSource;
}): Promise<CoachContext> {
  const profile = await input.dataSource.getProfilePreferences(input.userId);
  if (!profile) throw new AIContextFailure("PROFILE_NOT_FOUND");

  if (input.activeWorkoutId && !input.localCurrentSession) {
    const workout = await input.dataSource.getOwnedWorkout(input.userId, input.activeWorkoutId);
    if (!workout) throw new AIContextFailure("RESOURCE_NOT_FOUND");
  }

  const exerciseId = input.exerciseId ?? input.localCurrentSession?.exerciseId;
  if (!exerciseId) {
    return {
      authority: authorityLabels,
      userPreferences: profile,
      recentSessions: [],
      subjectiveNotes: buildMinimizedNoteContext({
        localCurrentSession: input.localCurrentSession,
        recentSessions: [],
      }),
      ...(input.localCurrentSession ? { localCurrentSession: input.localCurrentSession } : {}),
    };
  }

  const exercise = await input.dataSource.getAccessibleExercise(input.userId, exerciseId);
  if (!exercise) throw new AIContextFailure("RESOURCE_NOT_FOUND");

  const recentSessionsWithNotes = (
    await input.dataSource.getRecentSessions(input.userId, exerciseId, COACH_RECENT_SESSION_LIMIT)
  ).slice(0, COACH_RECENT_SESSION_LIMIT);
  const [recommendation, exercisePreferenceNote] = await Promise.all([
    input.dataSource.getActiveRecommendation(input.userId, exerciseId),
    input.dataSource.getExercisePreferenceNote(input.userId, exerciseId),
  ]);
  const recentSessions = stripNotesFromSessions(recentSessionsWithNotes);

  return {
    authority: authorityLabels,
    userPreferences: profile,
    exercise,
    recentSessions,
    currentRecommendation: recommendation ?? undefined,
    trendMetrics: input.dataSource.getTrendMetrics(recentSessions),
    subjectiveNotes: buildMinimizedNoteContext({
      exercisePreferenceNote,
      localCurrentSession: input.localCurrentSession,
      recentSessions: recentSessionsWithNotes,
    }),
    ...(input.localCurrentSession ? { localCurrentSession: input.localCurrentSession } : {}),
  };
}

const authorityLabels = {
  structuredWorkoutFacts: "authoritative",
  userAuthoredNotes: "subjective",
  aiInterpretation: "advisory",
} as const;
