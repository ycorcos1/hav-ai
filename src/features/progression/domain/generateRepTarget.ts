export type GenerateRepTargetInput = {
  achievedReps: number[];
  targetSets: number;
  minReps: number;
  maxReps: number;
};

export function generateRepTarget({
  achievedReps,
  targetSets,
  minReps,
  maxReps,
}: GenerateRepTargetInput): number[] | null {
  if (targetSets <= 0 || minReps <= 0 || maxReps < minReps) return null;
  const target = Array.from({ length: targetSets }, (_, index) =>
    Math.min(maxReps, Math.max(minReps, achievedReps[index] ?? minReps)),
  );

  for (let index = target.length - 1; index >= 0; index -= 1) {
    if (target[index] >= maxReps) continue;
    const next = target[index] + 1;
    if (index === 0 || target[index - 1] >= next) {
      target[index] = next;
      return target;
    }
  }
  return null;
}
