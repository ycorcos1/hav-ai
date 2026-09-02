import { bootstrapLocalDatabase } from "@/db";
import {
  SQLiteLocalRecommendationRepository,
  SQLiteLocalTemplateRepository,
  SQLiteLocalWorkoutRepository,
} from "@/db/repositories";

import type { StartWorkoutDependencies } from "./startWorkout";

export type WorkoutPersistence = StartWorkoutDependencies;

export async function createWorkoutPersistence(): Promise<WorkoutPersistence> {
  const database = await bootstrapLocalDatabase();
  return {
    recommendationRepository: new SQLiteLocalRecommendationRepository(database),
    templateRepository: new SQLiteLocalTemplateRepository(database),
    workoutRepository: new SQLiteLocalWorkoutRepository(database),
  };
}
