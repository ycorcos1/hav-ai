import { explainRecommendation } from "@/features/recommendations/explanations";
import type {
  ProgressionReasonCode,
  ProgressionRecommendationType,
} from "@/shared/contracts";

const recommendationTypes: ProgressionRecommendationType[] = [
  "increase_weight",
  "increase_reps",
  "repeat_target",
  "maintain_weight",
  "decrease_weight",
  "insufficient_data",
];
const reasonCodes: ProgressionReasonCode[] = [
  "INITIAL_BASELINE_ESTABLISHED",
  "TOP_OF_REP_RANGE_REACHED",
  "REP_RANGE_EXCEEDED",
  "REP_RANGE_MAXED",
  "WITHIN_TARGET_RANGE",
  "BELOW_TARGET_RANGE",
  "TOTAL_REPS_IMPROVED",
  "TOTAL_REPS_DECLINED",
  "PERFORMANCE_REPEATED",
  "RPE_ACCEPTABLE",
  "RPE_HIGH",
  "RPE_IMPROVED",
  "RPE_WORSENED",
  "RPE_UNAVAILABLE",
  "INCOMPLETE_TARGET_SETS",
  "EXTRA_SETS_PERFORMED",
  "MIXED_WORKING_LOADS",
  "SINGLE_SESSION_UNDERPERFORMANCE",
  "REPEATED_UNDERPERFORMANCE",
  "REPEATED_FAILED_PROGRESSION",
  "UNUSUAL_PERFORMANCE_DROP",
  "MULTI_SESSION_STALL",
  "PLATEAU_DETECTED",
  "ESTIMATED_1RM_IMPROVED",
  "ESTIMATED_1RM_DECLINED",
  "SMALLEST_INCREMENT_TOO_LARGE",
  "INSUFFICIENT_HISTORY",
];

describe("deterministic recommendation explanations", () => {
  it.each(recommendationTypes)("provides an offline title for %s", (recommendationType) => {
    expect(explainRecommendation({ recommendationType, reasonCodes: [] }).title).not.toHaveLength(0);
  });

  it("maps every canonical reason code in stable input order", () => {
    const result = explainRecommendation({ recommendationType: "increase_reps", reasonCodes });
    expect(result.reasons).toHaveLength(reasonCodes.length);
    expect(result.reasons.every((reason) => reason.length > 0)).toBe(true);
    expect(explainRecommendation({
      recommendationType: "increase_reps",
      reasonCodes,
    })).toEqual(result);
  });
});
