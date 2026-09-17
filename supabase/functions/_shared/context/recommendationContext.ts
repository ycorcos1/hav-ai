import { AIContextFailure } from "./errors";
import type {
  AIExercise,
  AIProfilePreferences,
  AIRecentSession,
  AIRecommendation,
  AITrendMetrics,
  RecommendationContextDataSource,
} from "./types";

export const EXPLANATION_RECENT_SESSION_LIMIT = 5;

export type RecommendationExplanationContext = {
  authority: {
    deterministicRecommendation: "authoritative";
    structuredWorkoutFacts: "authoritative";
    userAuthoredNotes: "subjective";
    aiExplanation: "advisory";
  };
  recommendation: AIRecommendation;
  exercise: AIExercise;
  userPreferences: AIProfilePreferences;
  sourceSession?: AIRecentSession;
  recentSessions: AIRecentSession[];
  trendMetrics: AITrendMetrics;
};

export async function buildRecommendationExplanationContext(input: {
  userId: string;
  recommendationId: string;
  dataSource: RecommendationContextDataSource;
}): Promise<RecommendationExplanationContext> {
  const recommendation = await input.dataSource.getOwnedRecommendation(
    input.userId,
    input.recommendationId,
  );
  if (!recommendation) throw new AIContextFailure("RESOURCE_NOT_FOUND");

  const [exercise, profile, sourceSession, recentSessionsResult] = await Promise.all([
    input.dataSource.getAccessibleExercise(input.userId, recommendation.exerciseId),
    input.dataSource.getProfilePreferences(input.userId),
    input.dataSource.getSourceSession(input.userId, recommendation),
    input.dataSource.getRecentSessions(
      input.userId,
      recommendation.exerciseId,
      EXPLANATION_RECENT_SESSION_LIMIT,
    ),
  ]);
  if (!exercise) throw new AIContextFailure("RESOURCE_NOT_FOUND");
  if (!profile) throw new AIContextFailure("PROFILE_NOT_FOUND");

  const recentSessions = recentSessionsResult.slice(0, EXPLANATION_RECENT_SESSION_LIMIT);
  return {
    authority: {
      deterministicRecommendation: "authoritative",
      structuredWorkoutFacts: "authoritative",
      userAuthoredNotes: "subjective",
      aiExplanation: "advisory",
    },
    recommendation,
    exercise,
    userPreferences: profile,
    sourceSession: sourceSession ?? undefined,
    recentSessions,
    trendMetrics: input.dataSource.getTrendMetrics(recentSessions),
  };
}

