import type { WeightUnit } from "./auth";
import type { RPE, UUID, WeightKg } from "./common";

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  meta?: {
    requestId?: string;
  };
};

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVALID_REQUEST"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "AI_TIMEOUT"
  | "AI_PROVIDER_ERROR"
  | "AI_INVALID_RESPONSE"
  | "AI_CONTEXT_ERROR"
  | "INTERNAL_ERROR";

export type ApiErrorResponse = {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    retryable: boolean;
  };
  meta?: {
    requestId?: string;
  };
};

export type CoachRequestV1 = {
  message: string;
  context?: {
    activeWorkoutId?: UUID;
    activeExerciseId?: UUID;
    localCurrentSession?: {
      workoutId: UUID;
      exerciseId: UUID;
      currentTarget?: {
        weightKg?: WeightKg;
        minReps: number;
        maxReps: number;
        targetSets: number;
      };
      completedSets: {
        weightKg?: WeightKg;
        reps: number;
        rpe?: RPE;
        notes?: string;
      }[];
      workoutNotes?: string;
      exercisePreferenceNotes?: string;
    };
  };
  conversation?: {
    messages: {
      role: "user" | "assistant";
      content: string;
    }[];
  };
};

export type CoachResponseV1 = {
  answer: string;
  recommendation?: {
    action: string;
    rationale: string;
  };
  warnings: string[];
  contextUsed: {
    activeWorkout: boolean;
    exerciseId?: UUID;
    recentSessionsUsed: number;
    subjectiveNotesUsed: {
      exercisePreference: boolean;
      workout: boolean;
      setCount: number;
    };
  };
  meta: {
    promptVersion: string;
  };
};

export type ExplainRecommendationRequestV1 = {
  recommendationId: UUID;
};

export type RecommendationExplanationV1 = {
  headline: string;
  summary: string;
  evidence: string[];
  caution?: string;
  meta: {
    promptVersion: string;
  };
};

export type ParseWorkoutRequestV1 = {
  text: string;
  exerciseId: UUID;
  displayUnit: WeightUnit;
};

export type ParseWorkoutResponseV1 = {
  sets: {
    weight?: number;
    unit?: WeightUnit;
    reps: number;
    rpe?: RPE;
  }[];
  confidence: "low" | "medium" | "high";
  ambiguities: string[];
  meta: {
    promptVersion: string;
  };
};
