import type {
  DetectedPersonalRecord,
  WorkoutSet,
} from "@/shared/contracts";

import { calculateEpleyOneRepMax } from "./epley";

type RecordSet = Pick<
  WorkoutSet,
  "completedAt" | "exerciseId" | "id" | "reps" | "setType" | "weightKg" | "workoutId"
>;

export function detectPersonalRecords(
  currentSets: readonly RecordSet[],
  historicalSets: readonly RecordSet[],
): DetectedPersonalRecord[] {
  const currentByExercise = groupByExercise(workingSets(currentSets));
  const historyByExercise = groupByExercise(workingSets(historicalSets));
  return [...currentByExercise.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([exerciseId, sets]) => detectForExercise(
      exerciseId,
      sets,
      historyByExercise.get(exerciseId) ?? [],
    ));
}

function detectForExercise(
  exerciseId: string,
  currentSets: RecordSet[],
  historicalSets: RecordSet[],
): DetectedPersonalRecord[] {
  const records: DetectedPersonalRecord[] = [];
  const currentWeighted = currentSets.filter(hasPositiveWeight);
  const historicalWeighted = historicalSets.filter(hasPositiveWeight);
  const maxWeightSet = maximumBy(currentWeighted, ({ weightKg }) => weightKg);
  const historicalMaxWeight = maximumValue(historicalWeighted, ({ weightKg }) => weightKg);
  if (maxWeightSet && exceeds(maxWeightSet.weightKg, historicalMaxWeight)) {
    records.push(recordFromSet("max_weight", exerciseId, maxWeightSet));
  }

  const currentE1RM = bestE1RM(currentWeighted);
  const historicalE1RM = bestE1RM(historicalWeighted);
  if (currentE1RM && exceeds(
    currentE1RM.estimated1RMKg,
    historicalE1RM?.estimated1RMKg,
  )) {
    records.push({
      ...recordFromSet("estimated_1rm", exerciseId, currentE1RM.set),
      estimated1RMKg: currentE1RM.estimated1RMKg,
    });
  }

  const currentByLoad = groupByLoad(currentSets);
  const historyByLoad = groupByLoad(historicalSets);
  [...currentByLoad.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([load, sets]) => {
      const bestCurrent = maximumBy(sets, ({ reps }) => reps);
      const historicalReps = maximumValue(historyByLoad.get(load) ?? [], ({ reps }) => reps);
      if (bestCurrent && exceeds(bestCurrent.reps, historicalReps)) {
        records.push(recordFromSet("rep_pr", exerciseId, bestCurrent));
      }
    });
  return records;
}

function recordFromSet(
  type: DetectedPersonalRecord["type"],
  exerciseId: string,
  set: RecordSet,
): DetectedPersonalRecord {
  return {
    type,
    exerciseId,
    workoutId: set.workoutId,
    setId: set.id,
    ...(set.weightKg === undefined ? {} : { weightKg: set.weightKg }),
    reps: set.reps,
    achievedAt: set.completedAt,
  };
}

function bestE1RM(sets: RecordSet[]) {
  return sets.reduce<{
    estimated1RMKg: number;
    set: RecordSet & { weightKg: number };
  } | null>((best, set) => {
    if (!hasPositiveWeight(set)) return best;
    const result = calculateEpleyOneRepMax(set.weightKg, set.reps);
    if (!result) return best;
    if (!best || result.estimated1RMKg > best.estimated1RMKg) {
      return { estimated1RMKg: result.estimated1RMKg, set };
    }
    return best;
  }, null);
}

function groupByExercise(sets: RecordSet[]): Map<string, RecordSet[]> {
  const groups = new Map<string, RecordSet[]>();
  sets.forEach((set) => groups.set(set.exerciseId, [...(groups.get(set.exerciseId) ?? []), set]));
  return groups;
}

function groupByLoad(sets: RecordSet[]): Map<string, RecordSet[]> {
  const groups = new Map<string, RecordSet[]>();
  sets.forEach((set) => {
    const key = set.weightKg === undefined
      ? "bodyweight"
      : `weight:${Math.round(set.weightKg / weightComparisonToleranceKg)}`;
    groups.set(key, [...(groups.get(key) ?? []), set]);
  });
  return groups;
}

function workingSets(sets: readonly RecordSet[]): RecordSet[] {
  return sets.filter(({ reps, setType }) => setType === "working" && reps > 0);
}

function hasPositiveWeight(set: RecordSet): set is RecordSet & { weightKg: number } {
  return set.weightKg !== undefined && Number.isFinite(set.weightKg) && set.weightKg > 0;
}

function maximumBy<T extends RecordSet>(items: T[], value: (item: T) => number): T | undefined {
  return [...items].sort((left, right) => (
    value(right) - value(left)
    || left.completedAt.localeCompare(right.completedAt)
    || left.id.localeCompare(right.id)
  ))[0];
}

function maximumValue<T extends RecordSet>(
  items: T[],
  value: (item: T) => number,
): number | undefined {
  const item = maximumBy(items, value);
  return item === undefined ? undefined : value(item);
}

function exceeds(value: number, previous: number | undefined): boolean {
  return previous === undefined || value - previous > numericComparisonTolerance;
}

const weightComparisonToleranceKg = 0.0001;
const numericComparisonTolerance = 1e-9;
