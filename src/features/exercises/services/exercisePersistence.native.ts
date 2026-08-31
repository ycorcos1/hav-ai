import { bootstrapLocalDatabase } from "@/db";
import {
  SQLiteLocalExerciseRepository,
  SQLiteLocalUserExercisePreferenceRepository,
} from "@/db/repositories";
import type {
  LocalExerciseRepository,
  LocalUserExercisePreferenceRepository,
} from "@/db/repositories/types";

export type ExercisePersistence = {
  exerciseRepository: LocalExerciseRepository;
  preferenceRepository: LocalUserExercisePreferenceRepository;
};

export async function createExercisePersistence(): Promise<ExercisePersistence> {
  const database = await bootstrapLocalDatabase();
  return {
    exerciseRepository: new SQLiteLocalExerciseRepository(database),
    preferenceRepository: new SQLiteLocalUserExercisePreferenceRepository(database),
  };
}
