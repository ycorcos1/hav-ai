import {
  coachSystemPrompt,
  recommendationExplanationSystemPrompt,
  workoutParserSystemPrompt,
} from "../supabase/functions/_shared/prompts";
import {
  aiEvaluationFixtures,
  aiEvaluationFixtureVersion,
} from "../test-utils/fixtures/aiEvaluationFixtures";

describe("curated AI evaluation fixtures", () => {
  it("versions and covers every canonical evaluation category exactly once", () => {
    expect(aiEvaluationFixtureVersion).toBe("ai-evals-v1");
    expect(aiEvaluationFixtures.map(({ category }) => category)).toEqual([
      "hallucination",
      "plateau",
      "no_history",
      "high_rpe",
      "parser_ambiguity",
      "engine_consistency",
      "pain_safety",
    ]);
    expect(new Set(aiEvaluationFixtures.map(({ id }) => id)).size).toBe(
      aiEvaluationFixtures.length,
    );
  });

  it("keeps every fixture measurable with required and forbidden behavior", () => {
    for (const fixture of aiEvaluationFixtures) {
      expect(fixture.input.trim()).not.toBe("");
      expect(fixture.expectations.requiredConcepts.length).toBeGreaterThan(0);
      expect(fixture.expectations.forbiddenClaims.length).toBeGreaterThan(0);
    }
  });

  it("anchors hallucination, missing-history, plateau, and high-RPE cases in structured facts", () => {
    const hallucination = aiEvaluationFixtures.find(({ category }) => category === "hallucination");
    const noHistory = aiEvaluationFixtures.find(({ category }) => category === "no_history");
    const plateau = aiEvaluationFixtures.find(({ category }) => category === "plateau");
    const highRpe = aiEvaluationFixtures.find(({ category }) => category === "high_rpe");

    expect(hallucination?.facts).toEqual({ recentSessions: [], trend: "insufficient_data" });
    expect(noHistory?.facts).toMatchObject({ recentSessions: [], recommendation: null });
    expect(plateau?.facts).toMatchObject({ trend: "flat", plateau: "likely" });
    expect(highRpe?.facts).toEqual({
      completedSets: [{ reps: 8, rpe: 9.5 }, { reps: 8, rpe: 10 }],
    });
  });

  it("keeps prompt authority aligned with the evaluation boundaries", () => {
    expect(coachSystemPrompt).toContain("never invent sets, weights, reps, RPE, dates, trends");
    expect(coachSystemPrompt).toContain("state uncertainty when evidence is limited");
    expect(coachSystemPrompt).toContain("Prioritize appropriate safety guidance");
    expect(coachSystemPrompt).toContain("Do not diagnose injuries");

    expect(recommendationExplanationSystemPrompt).toContain(
      "supplied deterministic recommendation is authoritative",
    );
    expect(recommendationExplanationSystemPrompt).toContain(
      "do not calculate or prescribe a competing target",
    );

    expect(workoutParserSystemPrompt).toContain("Surface ambiguities instead of guessing");
    expect(workoutParserSystemPrompt).toContain("Do not invent exercise IDs or canonical kilogram values");
    expect(workoutParserSystemPrompt).toContain("never claim it was persisted");
  });

  it("covers the canonical parser and engine-consistency failures explicitly", () => {
    const parser = aiEvaluationFixtures.find(({ category }) => category === "parser_ambiguity");
    const engine = aiEvaluationFixtures.find(({ category }) => category === "engine_consistency");

    expect(parser).toMatchObject({ feature: "parser", facts: { displayUnit: "lb" } });
    expect(parser?.expectations.requiredConcepts).toContain("surface ambiguity");
    expect(engine).toMatchObject({
      feature: "explanation",
      facts: {
        recommendationType: "increase_weight",
        previousWeightLb: 185,
        recommendedWeightLb: 190,
      },
    });
    expect(engine?.expectations.forbiddenClaims).toContain("stay at 185");
  });
});
