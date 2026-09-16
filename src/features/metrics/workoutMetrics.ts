type RepMetricSet = {
  reps: number;
  setType?: "working" | "warmup";
};

export type SessionDelta = {
  currentTotalReps: number;
  previousTotalReps: number;
  repDelta: number;
};

export function calculateTotalReps(sets: readonly RepMetricSet[]): number {
  return workingSets(sets).reduce((total, { reps }) => total + reps, 0);
}

export function calculateWorkingSetCount(sets: readonly RepMetricSet[]): number {
  return workingSets(sets).length;
}

export function calculateSessionDelta(
  currentSets: readonly RepMetricSet[],
  previousSets: readonly RepMetricSet[],
): SessionDelta {
  const currentTotalReps = calculateTotalReps(currentSets);
  const previousTotalReps = calculateTotalReps(previousSets);
  return {
    currentTotalReps,
    previousTotalReps,
    repDelta: currentTotalReps - previousTotalReps,
  };
}

function workingSets<T extends RepMetricSet>(sets: readonly T[]): T[] {
  return sets.filter(({ setType }) => setType !== "warmup");
}
