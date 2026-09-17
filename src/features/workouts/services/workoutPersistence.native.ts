import { bootstrapLocalDatabase } from "@/db";
import {
  SQLiteExerciseHistoryRepository,
  SQLiteLocalExerciseRepository,
  SQLiteLocalProfileCacheRepository,
  SQLiteLocalRecommendationRepository,
  SQLiteLocalTemplateRepository,
  SQLiteLocalWorkoutRepository,
} from "@/db/repositories";
import type {
  ExerciseHistoryRepository,
  LocalExerciseRepository,
  LocalProfileCacheRepository,
} from "@/db/repositories/types";

import type { StartWorkoutDependencies } from "./startWorkout";

export type WorkoutPersistence = StartWorkoutDependencies & {
  exerciseHistoryRepository: ExerciseHistoryRepository;
  exerciseRepository: LocalExerciseRepository;
  profileCacheRepository: LocalProfileCacheRepository;
};

export async function createWorkoutPersistence(): Promise<WorkoutPersistence> {
  const database = await bootstrapLocalDatabase();
  return {
    exerciseHistoryRepository: new SQLiteExerciseHistoryRepository(database),
    exerciseRepository: new SQLiteLocalExerciseRepository(database),
    profileCacheRepository: new SQLiteLocalProfileCacheRepository(database),
    recommendationRepository: new SQLiteLocalRecommendationRepository(database),
    templateRepository: new SQLiteLocalTemplateRepository(database),
    workoutRepository: new SQLiteLocalWorkoutRepository(database),
  };
}
