import type { ISODateTime, RPE, UUID, WeightKg } from "./common";
import type { DetectedPersonalRecordType } from "./personalRecords";
import type { ProgressionRecommendation } from "./progression";

export type WorkoutStatus = "active" | "completed" | "discarded";

export type WorkoutSetType = "working" | "warmup";

export type Workout = {
  id: UUID;
  userId: UUID;
  sourceTemplateId?: UUID;
  name: string;
  status: WorkoutStatus;
  startedAt: ISODateTime;
  completedAt?: ISODateTime;
  notes?: string;
  exercises: WorkoutExercise[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type WorkoutExercise = {
  id: UUID;
  userId: UUID;
  workoutId: UUID;
  exerciseId: UUID;
  position: number;
  targetSets?: number;
  targetMinReps?: number;
  targetMaxReps?: number;
  targetWeightKg?: WeightKg;
  sourceRecommendationId?: UUID;
  notes?: string;
  sets: WorkoutSet[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type WorkoutSet = {
  id: UUID;
  userId: UUID;
  workoutId: UUID;
  workoutExerciseId: UUID;
  exerciseId: UUID;
  position: number;
  setType: WorkoutSetType;
  weightKg?: WeightKg;
  reps: number;
  rpe?: RPE;
  notes?: string;
  completedAt: ISODateTime;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type CompleteSetInput = {
  workoutId: UUID;
  workoutExerciseId: UUID;
  exerciseId: UUID;
  setType: WorkoutSetType;
  weightKg?: WeightKg;
  reps: number;
  rpe?: RPE;
  notes?: string;
};

export type EditSetInput = {
  setId: UUID;
  weightKg?: WeightKg;
  reps: number;
  rpe?: RPE;
  notes?: string;
};

export type FinishWorkoutInput = {
  workoutId: UUID;
  completedAt: ISODateTime;
};

export type WorkoutSummary = {
  workoutId: UUID;
  durationSeconds: number;
  exerciseCount: number;
  workingSetCount: number;
  exerciseSummaries: ExerciseWorkoutSummary[];
};

export type ExerciseWorkoutSummary = {
  exerciseId: UUID;
  totalWorkingSets: number;
  totalReps: number;
  previousTotalReps?: number;
  repDelta?: number;
  bestSet?: {
    weightKg?: WeightKg;
    reps: number;
    rpe?: RPE;
  };
  detectedPRs: DetectedPersonalRecordType[];
  nextRecommendation?: ProgressionRecommendation;
};
