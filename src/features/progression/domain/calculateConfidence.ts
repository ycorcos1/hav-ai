import type { ProgressionConfidence } from "@/shared/contracts";
import type { ProgressionContext } from "./progressionContext";

export function calculateConfidence(context: ProgressionContext): ProgressionConfidence {
  if (
    context.classification === "irregular" ||
    context.input.currentSession.sets.length < context.input.currentTarget.targetSets ||
    context.trend.direction === "insufficient_data"
  ) {
    return context.input.recentSessions.length === 0 ? "low" : "medium";
  }
  if (context.trend.sessionsAnalyzed >= 3 && context.rpeMetrics.coverage >= 2 / 3) return "high";
  return "medium";
}
