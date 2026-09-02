import { bootstrapLocalDatabase } from "@/db";
import {
  SQLiteExerciseHistoryRepository,
  SQLiteLocalRecommendationRepository,
  SQLiteLocalTemplateRepository,
  SQLiteLocalWorkoutRepository,
} from "@/db/repositories";
import type { ExerciseHistoryRepository } from "@/db/repositories/types";

import type { StartWorkoutDependencies } from "./startWorkout";

export type WorkoutPersistence = StartWorkoutDependencies & {
  exerciseHistoryRepository: ExerciseHistoryRepository;
};

export async function createWorkoutPersistence(): Promise<WorkoutPersistence> {
  const database = await bootstrapLocalDatabase();
  return {
    exerciseHistoryRepository: new SQLiteExerciseHistoryRepository(database),
    recommendationRepository: new SQLiteLocalRecommendationRepository(database),
    templateRepository: new SQLiteLocalTemplateRepository(database),
    workoutRepository: new SQLiteLocalWorkoutRepository(database),
  };
}
