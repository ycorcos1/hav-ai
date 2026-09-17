import { calculateEpleyOneRepMax } from "@/features/metrics";
import type {
  ExerciseSessionPerformance,
  ISODateTime,
  RPE,
  UUID,
  WeightKg,
} from "@/shared/contracts";

export type ProgressSetMetric = {
  reps: number;
  rpe?: RPE;
  weightKg?: WeightKg;
};

export type StrengthTrendPoint = {
  completedAt: ISODateTime;
  estimated1RMKg: WeightKg;
  workoutId: UUID;
};

export type ExerciseProgressMetrics = {
  bestEstimated1RMKg?: WeightKg;
  bestSet?: ProgressSetMetric;
  bestWeightKg?: WeightKg;
  currentEstimated1RMKg?: WeightKg;
  lastPerformedAt?: ISODateTime;
  recentChangeKg?: number;
  trend: StrengthTrendPoint[];
};

export function calculateExerciseProgressMetrics(
  sessions: readonly ExerciseSessionPerformance[],
  allTime?: {
    bestEstimatedOneRepMaxSet?: ProgressSetMetric;
    bestWeightSet?: ProgressSetMetric;
  },
): ExerciseProgressMetrics {
  const ordered = [...sessions]
    .filter(({ completedAt }) => Number.isFinite(new Date(completedAt).getTime()))
    .sort((left, right) => (
      right.completedAt.localeCompare(left.completedAt)
      || right.workoutId.localeCompare(left.workoutId)
    ));
  const trend = ordered
    .map((session) => {
      const estimated1RMKg = bestSessionEstimated1RM(session);
      return estimated1RMKg === undefined ? null : {
        workoutId: session.workoutId,
        completedAt: session.completedAt,
        estimated1RMKg,
      };
    })
    .filter((point): point is StrengthTrendPoint => point !== null)
    .reverse();
  const currentEstimated1RMKg = trend.at(-1)?.estimated1RMKg;
  const previousEstimated1RMKg = trend.at(-2)?.estimated1RMKg;
  const allSets = ordered.flatMap(({ sets }) => sets)
    .filter(({ reps }) => Number.isInteger(reps) && reps > 0);
  const bestSet = allTime?.bestEstimatedOneRepMaxSet
    ? toProgressSet(allTime.bestEstimatedOneRepMaxSet)
    : [...allSets].sort(compareBestSets)[0];
  const weightedSets = allSets.filter(
    (set): set is ProgressSetMetric & { weightKg: number } => (
      set.weightKg !== undefined && Number.isFinite(set.weightKg) && set.weightKg >= 0
    ),
  );
  const bestWeightKg = allTime?.bestWeightSet?.weightKg ?? (weightedSets.length > 0
    ? Math.max(...weightedSets.map(({ weightKg }) => weightKg))
    : undefined);
  const allTimeBestEstimate = allTime?.bestEstimatedOneRepMaxSet
    ? estimate(allTime.bestEstimatedOneRepMaxSet)
    : undefined;
  const bestEstimated1RMKg = allTimeBestEstimate ?? (trend.length > 0
    ? Math.max(...trend.map(({ estimated1RMKg }) => estimated1RMKg))
    : undefined);
  return {
    ...(currentEstimated1RMKg === undefined ? {} : { currentEstimated1RMKg }),
    ...(bestEstimated1RMKg === undefined ? {} : { bestEstimated1RMKg }),
    ...(bestWeightKg === undefined ? {} : { bestWeightKg }),
    ...(bestSet === undefined ? {} : { bestSet }),
    ...(ordered[0] === undefined ? {} : { lastPerformedAt: ordered[0].completedAt }),
    ...(currentEstimated1RMKg === undefined || previousEstimated1RMKg === undefined
      ? {}
      : { recentChangeKg: currentEstimated1RMKg - previousEstimated1RMKg }),
    trend,
  };
}

function bestSessionEstimated1RM(session: ExerciseSessionPerformance): number | undefined {
  const values = session.sets.flatMap(({ weightKg, reps }) => {
    if (weightKg === undefined || !Number.isFinite(weightKg) || weightKg <= 0) return [];
    const result = calculateEpleyOneRepMax(weightKg, reps);
    return result ? [result.estimated1RMKg] : [];
  });
  return values.length > 0 ? Math.max(...values) : undefined;
}

function compareBestSets(left: ProgressSetMetric, right: ProgressSetMetric): number {
  const leftEstimate = estimate(left);
  const rightEstimate = estimate(right);
  return rightEstimate - leftEstimate
    || (right.weightKg ?? 0) - (left.weightKg ?? 0)
    || right.reps - left.reps;
}

function estimate(set: ProgressSetMetric): number {
  if (set.weightKg === undefined || set.weightKg <= 0) return set.reps;
  return calculateEpleyOneRepMax(set.weightKg, set.reps)?.estimated1RMKg ?? 0;
}

function toProgressSet(set: ProgressSetMetric): ProgressSetMetric {
  return {
    reps: set.reps,
    ...(set.weightKg === undefined ? {} : { weightKg: set.weightKg }),
    ...(set.rpe === undefined ? {} : { rpe: set.rpe }),
  };
}
