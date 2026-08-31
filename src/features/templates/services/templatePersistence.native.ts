import { bootstrapLocalDatabase } from "@/db";
import {
  SQLiteLocalExerciseRepository,
  SQLiteLocalTemplateRepository,
} from "@/db/repositories";
import type {
  LocalExerciseRepository,
  LocalTemplateRepository,
} from "@/db/repositories/types";

export type TemplatePersistence = {
  exerciseRepository: LocalExerciseRepository;
  templateRepository: LocalTemplateRepository;
};

export async function createTemplatePersistence(): Promise<TemplatePersistence> {
  const database = await bootstrapLocalDatabase();
  return {
    exerciseRepository: new SQLiteLocalExerciseRepository(database),
    templateRepository: new SQLiteLocalTemplateRepository(database),
  };
}
