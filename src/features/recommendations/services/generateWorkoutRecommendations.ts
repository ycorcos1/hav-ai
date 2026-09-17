import type {
  ExerciseHistoryRepository,
  LocalExerciseRepository,
  LocalProfileCacheRepository,
} from "@/db/repositories";
import { calculateProgression } from "@/features/progression";
import type {
  ProgressionRecommendation,
  UUID,
  Workout,
  WorkoutExercise,
} from "@/shared/contracts";

export type GenerateWorkoutRecommendationsDependencies = {
  exerciseHistoryRepository: ExerciseHistoryRepository;
  exerciseRepository: LocalExerciseRepository;
  profileCacheRepository: LocalProfileCacheRepository;
};

export async function generateWorkoutRecommendations(
  dependencies: GenerateWorkoutRecommendationsDependencies,
  workout: Workout,
): Promise<ProgressionRecommendation[]> {
  const profile = await dependencies.profileCacheRepository.get(workout.userId);
  if (!profile || workout.completedAt === undefined) return [];

  const recommendations: ProgressionRecommendation[] = [];
  for (const workoutExercise of [...workout.exercises].sort(
    (left, right) => left.position - right.position,
  )) {
    const recommendation = await recommendationForExercise(
      dependencies,
      workout,
      workoutExercise,
      profile.primaryGoal,
      profile.progressionStyle,
    );
    if (recommendation) recommendations.push(recommendation);
  }
  return recommendations;
}

export async function generateExerciseRecommendation(
  dependencies: GenerateWorkoutRecommendationsDependencies,
  workout: Workout,
  workoutExercise: WorkoutExercise,
): Promise<ProgressionRecommendation | null> {
  const profile = await dependencies.profileCacheRepository.get(workout.userId);
  if (!profile || workout.completedAt === undefined) return null;
  return recommendationForExercise(
    dependencies,
    workout,
    workoutExercise,
    profile.primaryGoal,
    profile.progressionStyle,
  );
}

async function recommendationForExercise(
  dependencies: GenerateWorkoutRecommendationsDependencies,
  workout: Workout,
  workoutExercise: WorkoutExercise,
  primaryGoal: "strength" | "hypertrophy" | "hybrid",
  progressionStyle: "conservative" | "balanced" | "aggressive",
): Promise<ProgressionRecommendation | null> {
  const { targetSets, targetMinReps, targetMaxReps } = workoutExercise;
  const workingSets = workoutExercise.sets
    .filter((set) => set.setType === "working")
    .sort((left, right) => left.position - right.position);
  if (
    targetSets === undefined ||
    targetMinReps === undefined ||
    targetMaxReps === undefined ||
    workingSets.length === 0 ||
    workout.completedAt === undefined
  ) return null;

  const [exercise, loadedRecentSessions] = await Promise.all([
    dependencies.exerciseRepository.getById(workout.userId, workoutExercise.exerciseId),
    dependencies.exerciseHistoryRepository.getRecentSessions({
      userId: workout.userId,
      exerciseId: workoutExercise.exerciseId,
      limit: 5,
    }),
  ]);
  if (!exercise) return null;
  const recentSessions = loadedRecentSessions.filter(({ workoutId }) => workoutId !== workout.id);

  const result = calculateProgression({
    exercise: {
      exerciseId: exercise.id,
      measurementType: exercise.measurementType,
      equipmentType: exercise.equipmentType,
    },
    currentTarget: {
      targetSets,
      minReps: targetMinReps,
      maxReps: targetMaxReps,
      ...(workoutExercise.targetWeightKg === undefined
        ? {}
        : { targetWeightKg: workoutExercise.targetWeightKg }),
    },
    currentSession: {
      workoutId: workout.id,
      completedAt: workout.completedAt,
      sets: workingSets.map(({ weightKg, reps, rpe }) => ({
        ...(weightKg === undefined ? {} : { weightKg }),
        reps,
        ...(rpe === undefined ? {} : { rpe }),
      })),
    },
    recentSessions,
    preferences: { primaryGoal, progressionStyle },
  });
  return {
    id: createUuid(),
    userId: workout.userId,
    exerciseId: workoutExercise.exerciseId,
    sourceWorkoutId: workout.id,
    sourceWorkoutExerciseId: workoutExercise.id,
    recommendationType: result.recommendationType,
    ...(result.recommendedWeightKg === undefined
      ? {}
      : { recommendedWeightKg: result.recommendedWeightKg }),
    ...(result.targetSets === undefined ? {} : { targetSets: result.targetSets }),
    ...(result.targetMinReps === undefined ? {} : { targetMinReps: result.targetMinReps }),
    ...(result.targetMaxReps === undefined ? {} : { targetMaxReps: result.targetMaxReps }),
    ...(result.targetSetReps === undefined ? {} : { targetSetReps: result.targetSetReps }),
    confidence: result.confidence,
    reasonCodes: result.reasonCodes,
    status: "active",
    engineVersion: result.engineVersion,
    createdAt: workout.completedAt,
    updatedAt: workout.completedAt,
  };
}

function createUuid(): UUID {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}
