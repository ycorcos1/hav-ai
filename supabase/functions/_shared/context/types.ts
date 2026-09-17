export type AIProfilePreferences = {
  primaryGoal: string;
  progressionStyle: string;
  weightUnit: string;
  rpePreference: string;
};

export type AIExercise = {
  id: string;
  name: string;
  measurementType: string;
};

export type AISessionSet = {
  weightKg?: number;
  reps: number;
  rpe?: number;
  notes?: string;
};

export type AIRecentSession = {
  workoutId: string;
  workoutExerciseId: string;
  completedAt: string;
  sets: AISessionSet[];
  workoutNotes?: string;
  exerciseNotes?: string;
};

export type AIRecommendation = {
  id: string;
  exerciseId: string;
  sourceWorkoutId?: string;
  sourceWorkoutExerciseId?: string;
  recommendationType: string;
  recommendedWeightKg?: number;
  targetSets?: number;
  targetMinReps?: number;
  targetMaxReps?: number;
  targetSetReps?: number[];
  confidence: string;
  reasonCodes: string[];
  status: string;
  engineVersion: string;
};

export type AITrendMetrics = {
  direction: "improving" | "flat" | "declining" | "insufficient_data";
  sessionsAnalyzed: number;
  totalRepChange?: number;
  estimated1RMChangePct?: number;
  averageRpeChange?: number;
  plateau: "none" | "possible" | "likely";
};

export type ValidatedLocalCurrentSession = {
  workoutId: string;
  exerciseId: string;
  currentTarget?: {
    weightKg?: number;
    minReps: number;
    maxReps: number;
    targetSets: number;
  };
  completedSets: AISessionSet[];
  workoutNotes?: string;
  exercisePreferenceNotes?: string;
};

export interface CoachContextDataSource {
  getProfilePreferences(userId: string): Promise<AIProfilePreferences | null>;
  getAccessibleExercise(userId: string, exerciseId: string): Promise<AIExercise | null>;
  getRecentSessions(userId: string, exerciseId: string, limit: number): Promise<AIRecentSession[]>;
  getActiveRecommendation(userId: string, exerciseId: string): Promise<AIRecommendation | null>;
  getTrendMetrics(sessions: readonly AIRecentSession[]): AITrendMetrics;
}

export interface RecommendationContextDataSource {
  getOwnedRecommendation(userId: string, recommendationId: string): Promise<AIRecommendation | null>;
  getAccessibleExercise(userId: string, exerciseId: string): Promise<AIExercise | null>;
  getRecentSessions(userId: string, exerciseId: string, limit: number): Promise<AIRecentSession[]>;
  getSourceSession(
    userId: string,
    recommendation: AIRecommendation,
  ): Promise<AIRecentSession | null>;
  getProfilePreferences(userId: string): Promise<AIProfilePreferences | null>;
  getTrendMetrics(sessions: readonly AIRecentSession[]): AITrendMetrics;
}

