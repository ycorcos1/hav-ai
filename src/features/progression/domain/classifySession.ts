import { progressionConfig } from "@/features/progression/config";
import type {
  ProgressionSetPerformance,
  SessionClassification,
} from "@/features/progression/types";

export type SessionClassificationInput = {
  sets: ProgressionSetPerformance[];
  targetSets: number;
  minReps: number;
  maxReps: number;
  targetSetReps?: number[];
};

function hasMixedWorkingLoads(sets: ProgressionSetPerformance[]): boolean {
  const weightedSets = sets.filter((set) => set.weightKg !== undefined);
  if (weightedSets.length !== sets.length || weightedSets.length < 2) return false;

  const firstWeight = weightedSets[0].weightKg as number;
  return weightedSets.some(
    (set) =>
      Math.abs((set.weightKg as number) - firstWeight) >
      progressionConfig.weightComparisonToleranceKg,
  );
}

export function classifySession({
  sets,
  targetSets,
  minReps,
  maxReps,
  targetSetReps,
}: SessionClassificationInput): SessionClassification {
  if (hasMixedWorkingLoads(sets)) return "irregular";
  if (sets.length === 0) return "severe_underperformance";

  const intendedSets = sets.slice(0, targetSets);
  const completedIntendedSetCount = intendedSets.length;
  const completedEnoughSets = completedIntendedSetCount >= targetSets;
  const perfect = completedEnoughSets && intendedSets.every((set, index) => {
    const explicitTarget = targetSetReps?.[index];
    return set.reps >= (explicitTarget ?? maxReps);
  });

  if (perfect) return "perfect";
  if (completedEnoughSets && intendedSets.every((set) => set.reps >= minReps)) {
    return "successful";
  }

  const substantialSetCount = completedIntendedSetCount >= Math.ceil(targetSets / 2);
  const repRatio =
    intendedSets.reduce((total, set) => total + set.reps, 0) /
    (Math.max(completedIntendedSetCount, 1) * minReps);

  return substantialSetCount && repRatio >= progressionConfig.severeUnderperformanceRepRatio
    ? "partial_underperformance"
    : "severe_underperformance";
}
