import type {
  BasicRecommendationExplanation,
  ProgressionReasonCode,
  ProgressionRecommendation,
} from "@/shared/contracts";

const reasonMessages: Record<ProgressionReasonCode, string> = {
  INITIAL_BASELINE_ESTABLISHED: "This workout establishes a useful starting point.",
  TOP_OF_REP_RANGE_REACHED: "You reached the top of your target rep range across the planned sets.",
  REP_RANGE_EXCEEDED: "Your completed reps exceeded the configured target range.",
  REP_RANGE_MAXED: "You reached the maximum configured rep target for this exercise.",
  WITHIN_TARGET_RANGE: "Your working sets stayed within the target rep range.",
  BELOW_TARGET_RANGE: "Some working sets finished below the target rep range.",
  TOTAL_REPS_IMPROVED: "Your total completed reps improved across comparable sessions.",
  TOTAL_REPS_DECLINED: "Your total completed reps declined across comparable sessions.",
  PERFORMANCE_REPEATED: "Your recent comparable performance was substantially unchanged.",
  RPE_ACCEPTABLE: "Your recorded effort was within the progression threshold.",
  RPE_HIGH: "Your recorded effort was high, so progression is being limited.",
  RPE_IMPROVED: "You matched or improved performance at a lower effort.",
  RPE_WORSENED: "Comparable performance required meaningfully more effort.",
  RPE_UNAVAILABLE: "No RPE was recorded; the recommendation uses the available set data.",
  INCOMPLETE_TARGET_SETS: "Fewer working sets were completed than planned.",
  EXTRA_SETS_PERFORMED: "You completed extra working sets beyond the planned target.",
  MIXED_WORKING_LOADS: "Mixed working loads make a precise rep target unreliable.",
  SINGLE_SESSION_UNDERPERFORMANCE: "One below-target session is not enough to reduce the load.",
  REPEATED_UNDERPERFORMANCE: "Multiple comparable sessions finished below target.",
  REPEATED_FAILED_PROGRESSION: "The newer load missed its target repeatedly.",
  UNUSUAL_PERFORMANCE_DROP: "This session was unusually lower than your recent performance.",
  MULTI_SESSION_STALL: "Recent comparable sessions show little meaningful progression.",
  PLATEAU_DETECTED: "A sustained multi-session plateau was detected.",
  ESTIMATED_1RM_IMPROVED: "Your estimated one-rep max improved meaningfully.",
  ESTIMATED_1RM_DECLINED: "Your estimated one-rep max declined meaningfully.",
  SMALLEST_INCREMENT_TOO_LARGE: "The smallest available load increase would be too large.",
  INSUFFICIENT_HISTORY: "There is not enough reliable information for a precise target yet.",
};

const titles: Record<ProgressionRecommendation["recommendationType"], string> = {
  increase_weight: "Increase the load",
  increase_reps: "Add reps at the same load",
  repeat_target: "Repeat the target",
  maintain_weight: "Maintain the load",
  decrease_weight: "Reduce the load",
  insufficient_data: "Keep building your baseline",
};

export function explainRecommendation(
  recommendation: Pick<ProgressionRecommendation, "recommendationType" | "reasonCodes">,
): BasicRecommendationExplanation {
  return {
    title: titles[recommendation.recommendationType],
    reasons: recommendation.reasonCodes.map((reason) => reasonMessages[reason]),
  };
}
