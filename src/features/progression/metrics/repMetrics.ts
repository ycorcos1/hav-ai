import type { ProgressionSetPerformance, RepMetrics } from "@/features/progression/types";

export function calculateRepMetrics(sets: ProgressionSetPerformance[]): RepMetrics {
  const totalReps = sets.reduce((total, set) => total + set.reps, 0);
  return {
    totalReps,
    averageReps: sets.length === 0 ? null : totalReps / sets.length,
    bestSetReps: sets.length === 0 ? null : Math.max(...sets.map((set) => set.reps)),
    workingSetCount: sets.length,
  };
}
