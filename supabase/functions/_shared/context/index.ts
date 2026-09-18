export { AIContextFailure } from "./errors.ts";
export type { AIContextFailureCode } from "./errors.ts";
export { buildCoachContext, COACH_RECENT_SESSION_LIMIT } from "./coachContext.ts";
export type { CoachContext } from "./coachContext.ts";
export {
  buildRecommendationExplanationContext,
  EXPLANATION_RECENT_SESSION_LIMIT,
} from "./recommendationContext.ts";
export type { RecommendationExplanationContext } from "./recommendationContext.ts";
export { SupabaseAIContextDataSource } from "./supabaseContextDataSource.ts";
export {
  buildMinimizedNoteContext,
  MAX_AI_NOTE_CHARACTERS,
  MAX_AI_NOTE_CONTEXT_CHARACTERS,
  MAX_AI_SET_NOTES,
  stripNotesFromSessions,
} from "./noteContext.ts";
export type { SubjectiveNoteContext } from "./noteContext.ts";
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
} from "./types.ts";
