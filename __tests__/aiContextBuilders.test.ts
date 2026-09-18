import {
  AIContextFailure,
  buildCoachContext,
  buildRecommendationExplanationContext,
  type AIRecentSession,
  type CoachContextDataSource,
  type RecommendationContextDataSource,
} from "../supabase/functions/_shared/context";

const userId = "11111111-1111-4111-8111-111111111111";
const exerciseId = "22222222-2222-4222-8222-222222222222";
const recommendationId = "33333333-3333-4333-8333-333333333333";

const profile = {
  primaryGoal: "strength",
  progressionStyle: "balanced",
  weightUnit: "lb",
  rpePreference: "optional",
};
const exercise = { id: exerciseId, name: "Incline Press", measurementType: "weighted_reps" };
const recommendation = {
  id: recommendationId,
  exerciseId,
  recommendationType: "increase_weight",
  recommendedWeightKg: 86,
  confidence: "high",
  reasonCodes: ["TOP_OF_REP_RANGE_REACHED"],
  status: "active",
  engineVersion: "progression-v1",
};
const sessions: AIRecentSession[] = Array.from({ length: 7 }, (_, index) => ({
  workoutId: `workout-${index}`,
  workoutExerciseId: `workout-exercise-${index}`,
  completedAt: `2026-09-${String(10 - index).padStart(2, "0")}T12:00:00.000Z`,
  sets: [{ weightKg: 84, reps: 8 }],
}));
const trend = { direction: "improving" as const, sessionsAnalyzed: 5, plateau: "none" as const };

function coachSource(overrides: Partial<CoachContextDataSource> = {}): CoachContextDataSource {
  return {
    getProfilePreferences: jest.fn().mockResolvedValue(profile),
    getAccessibleExercise: jest.fn().mockResolvedValue(exercise),
    getOwnedWorkout: jest.fn().mockResolvedValue({ id: "workout-id" }),
    getRecentSessions: jest.fn().mockResolvedValue(sessions),
    getActiveRecommendation: jest.fn().mockResolvedValue(recommendation),
    getTrendMetrics: jest.fn().mockReturnValue(trend),
    ...overrides,
  };
}

function recommendationSource(
  overrides: Partial<RecommendationContextDataSource> = {},
): RecommendationContextDataSource {
  return {
    getOwnedRecommendation: jest.fn().mockResolvedValue(recommendation),
    getAccessibleExercise: jest.fn().mockResolvedValue(exercise),
    getRecentSessions: jest.fn().mockResolvedValue(sessions),
    getSourceSession: jest.fn().mockResolvedValue(sessions[0]),
    getProfilePreferences: jest.fn().mockResolvedValue(profile),
    getTrendMetrics: jest.fn().mockReturnValue(trend),
    ...overrides,
  };
}

describe("AI context builders", () => {
  it("builds minimal exercise-specific coach context for the authenticated user", async () => {
    const dataSource = coachSource();
    const localCurrentSession = {
      workoutId: "44444444-4444-4444-8444-444444444444",
      exerciseId,
      completedSets: [{ weightKg: 86, reps: 6, rpe: 10 }],
    };

    const context = await buildCoachContext({ userId, exerciseId, localCurrentSession, dataSource });

    expect(context).toMatchObject({
      authority: {
        structuredWorkoutFacts: "authoritative",
        userAuthoredNotes: "subjective",
        aiInterpretation: "advisory",
      },
      userPreferences: profile,
      exercise,
      currentRecommendation: recommendation,
      trendMetrics: trend,
      localCurrentSession,
    });
    expect(context.recentSessions).toHaveLength(5);
    expect(dataSource.getRecentSessions).toHaveBeenCalledWith(userId, exerciseId, 5);
    expect(dataSource.getActiveRecommendation).toHaveBeenCalledWith(userId, exerciseId);
    expect(context).not.toHaveProperty("email");
  });

  it("supports general coaching without loading unrelated exercise history", async () => {
    const dataSource = coachSource();
    const context = await buildCoachContext({ userId, dataSource });

    expect(context.recentSessions).toEqual([]);
    expect(dataSource.getAccessibleExercise).not.toHaveBeenCalled();
    expect(dataSource.getRecentSessions).not.toHaveBeenCalled();
    expect(dataSource.getActiveRecommendation).not.toHaveBeenCalled();
  });

  it("verifies a referenced cloud workout when no local session supplies it", async () => {
    const dataSource = coachSource({ getOwnedWorkout: jest.fn().mockResolvedValue(null) });
    await expect(buildCoachContext({
      userId,
      activeWorkoutId: "44444444-4444-4444-8444-444444444444",
      dataSource,
    })).rejects.toMatchObject({ code: "RESOURCE_NOT_FOUND" });
    expect(dataSource.getOwnedWorkout).toHaveBeenCalledWith(
      userId,
      "44444444-4444-4444-8444-444444444444",
    );
  });

  it("rejects inaccessible coach resources with a sanitized context error", async () => {
    const dataSource = coachSource({ getAccessibleExercise: jest.fn().mockResolvedValue(null) });
    await expect(buildCoachContext({ userId, exerciseId, dataSource })).rejects.toEqual(
      new AIContextFailure("RESOURCE_NOT_FOUND"),
    );
  });

  it("resolves recommendation explanation context by owned recommendation ID", async () => {
    const dataSource = recommendationSource();
    const context = await buildRecommendationExplanationContext({
      userId,
      recommendationId,
      dataSource,
    });

    expect(dataSource.getOwnedRecommendation).toHaveBeenCalledWith(userId, recommendationId);
    expect(dataSource.getSourceSession).toHaveBeenCalledWith(userId, recommendation);
    expect(context).toMatchObject({
      recommendation,
      exercise,
      userPreferences: profile,
      sourceSession: sessions[0],
      trendMetrics: trend,
      authority: { deterministicRecommendation: "authoritative" },
    });
    expect(context.recentSessions).toHaveLength(5);
  });

  it("does not reveal whether an unowned recommendation exists", async () => {
    const dataSource = recommendationSource({
      getOwnedRecommendation: jest.fn().mockResolvedValue(null),
    });

    await expect(
      buildRecommendationExplanationContext({ userId, recommendationId, dataSource }),
    ).rejects.toMatchObject({
      code: "RESOURCE_NOT_FOUND",
      message: "The requested AI context could not be built.",
    });
    expect(dataSource.getAccessibleExercise).not.toHaveBeenCalled();
  });
});
