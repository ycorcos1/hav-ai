import type { ISODateTime, UUID } from "./common";

export type WorkoutTemplate = {
  id: UUID;
  userId: UUID;
  name: string;
  notes?: string;
  isArchived: boolean;
  exercises: WorkoutTemplateExercise[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type WorkoutTemplateExercise = {
  id: UUID;
  userId: UUID;
  templateId: UUID;
  exerciseId: UUID;
  position: number;
  targetSets: number;
  targetMinReps: number;
  targetMaxReps: number;
  notes?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};
