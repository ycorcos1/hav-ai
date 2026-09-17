import type { SessionClassification } from "@/features/progression/types";

export function isUnderperformance(classification: SessionClassification): boolean {
  return (
    classification === "partial_underperformance" || classification === "severe_underperformance"
  );
}

export function hasRepeatedUnderperformance(
  current: SessionClassification,
  recent: SessionClassification[],
): boolean {
  return isUnderperformance(current) && recent.slice(0, 2).some(isUnderperformance);
}
