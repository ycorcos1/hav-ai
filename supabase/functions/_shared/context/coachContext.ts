import { AIContextFailure } from "./errors";
import type {
  AIExercise,
  AIProfilePreferences,
  AIRecentSession,
  AIRecommendation,
  AITrendMetrics,
  CoachContextDataSource,
  ValidatedLocalCurrentSession,
} from "./types";

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
  localCurrentSession?: ValidatedLocalCurrentSession;
};

export async function buildCoachContext(input: {
  userId: string;
  exerciseId?: string;
  localCurrentSession?: ValidatedLocalCurrentSession;
  dataSource: CoachContextDataSource;
}): Promise<CoachContext> {
  const profile = await input.dataSource.getProfilePreferences(input.userId);
  if (!profile) throw new AIContextFailure("PROFILE_NOT_FOUND");

  const exerciseId = input.exerciseId ?? input.localCurrentSession?.exerciseId;
  if (!exerciseId) {
    return {
      authority: authorityLabels,
      userPreferences: profile,
      recentSessions: [],
      ...(input.localCurrentSession ? { localCurrentSession: input.localCurrentSession } : {}),
    };
  }

  const exercise = await input.dataSource.getAccessibleExercise(input.userId, exerciseId);
  if (!exercise) throw new AIContextFailure("RESOURCE_NOT_FOUND");

  const recentSessions = (
    await input.dataSource.getRecentSessions(input.userId, exerciseId, COACH_RECENT_SESSION_LIMIT)
  ).slice(0, COACH_RECENT_SESSION_LIMIT);
  const recommendation = await input.dataSource.getActiveRecommendation(input.userId, exerciseId);

  return {
    authority: authorityLabels,
    userPreferences: profile,
    exercise,
    recentSessions,
    currentRecommendation: recommendation ?? undefined,
    trendMetrics: input.dataSource.getTrendMetrics(recentSessions),
    ...(input.localCurrentSession ? { localCurrentSession: input.localCurrentSession } : {}),
  };
}

const authorityLabels = {
  structuredWorkoutFacts: "authoritative",
  userAuthoredNotes: "subjective",
  aiInterpretation: "advisory",
} as const;

