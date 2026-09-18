import type {
  CoachRequestV1,
  ExplainRecommendationRequestV1,
  ParseWorkoutRequestV1,
} from "@/shared/contracts";
import {
  coachRequestV1Schema,
  explainRecommendationRequestV1Schema,
  parseWorkoutRequestV1Schema,
} from "@/shared/schemas";

const MAX_MESSAGE_LENGTH = 1_000;
const MAX_CONVERSATION_MESSAGES = 12;
const MAX_COMPLETED_SETS = 20;
const MAX_NOTE_LENGTH = 1_000;
const MAX_AGGREGATE_NOTE_LENGTH = 3_000;

export function parseCoachRequest(value: unknown): CoachRequestV1 | null {
  const result = coachRequestV1Schema.safeParse(value);
  if (!result.success) return null;
  const request = result.data;
  if (request.message.length > MAX_MESSAGE_LENGTH) return null;
  if ((request.conversation?.messages.length ?? 0) > MAX_CONVERSATION_MESSAGES) return null;
  if (request.conversation?.messages.some(({ content }) => content.length > MAX_MESSAGE_LENGTH)) {
    return null;
  }

  const local = request.context?.localCurrentSession;
  if ((local?.completedSets.length ?? 0) > MAX_COMPLETED_SETS) return null;
  const notes = [
    local?.workoutNotes,
    local?.exercisePreferenceNotes,
    ...(local?.completedSets.map(({ notes }) => notes) ?? []),
  ].filter((note): note is string => note !== undefined);
  if (notes.some((note) => note.length > MAX_NOTE_LENGTH)) return null;
  if (notes.reduce((length, note) => length + note.length, 0) > MAX_AGGREGATE_NOTE_LENGTH) {
    return null;
  }

  if (
    local &&
    ((request.context?.activeWorkoutId && request.context.activeWorkoutId !== local.workoutId) ||
      (request.context?.activeExerciseId && request.context.activeExerciseId !== local.exerciseId))
  ) {
    return null;
  }
  return request;
}

export function parseExplanationRequest(value: unknown): ExplainRecommendationRequestV1 | null {
  const result = explainRecommendationRequestV1Schema.safeParse(value);
  return result.success ? result.data : null;
}

export function parseWorkoutRequest(value: unknown): ParseWorkoutRequestV1 | null {
  const result = parseWorkoutRequestV1Schema.safeParse(value);
  if (!result.success || result.data.text.length > 2_000) return null;
  return result.data;
}
