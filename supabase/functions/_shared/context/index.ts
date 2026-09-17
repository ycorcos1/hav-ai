export { AIContextFailure } from "./errors";
export type { AIContextFailureCode } from "./errors";
export { buildCoachContext, COACH_RECENT_SESSION_LIMIT } from "./coachContext";
export type { CoachContext } from "./coachContext";
export {
  buildRecommendationExplanationContext,
  EXPLANATION_RECENT_SESSION_LIMIT,
} from "./recommendationContext";
export type { RecommendationExplanationContext } from "./recommendationContext";
export type {
  AIExercise,
  AIProfilePreferences,
  AIRecentSession,
  AIRecommendation,
  AISessionSet,
  AITrendMetrics,
  CoachContextDataSource,
  RecommendationContextDataSource,
  ValidatedLocalCurrentSession,
} from "./types";

