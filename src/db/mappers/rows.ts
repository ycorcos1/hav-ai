import type {
  EquipmentType,
  ISODateTime,
  LocalSyncStatus,
  MeasurementType,
  MuscleGroup,
  ProgressionConfidence,
  ProgressionRecommendationType,
  RPE,
  UUID,
  WorkoutSetType,
  WorkoutStatus,
} from "@/shared/contracts";

export type SQLiteBoolean = 0 | 1;

export type LocalPersistenceMetadata = {
  syncStatus: LocalSyncStatus;
  serverUpdatedAt?: ISODateTime;
};

export type LocalWorkoutRow = {
  id: UUID;
  user_id: UUID;
  source_template_id: UUID | null;
  name: string;
  status: WorkoutStatus;
  started_at: ISODateTime;
  completed_at: ISODateTime | null;
  notes: string | null;
  sync_status: LocalSyncStatus;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  server_updated_at: ISODateTime | null;
};

export type LocalWorkoutExerciseRow = {
  id: UUID;
  user_id: UUID;
  workout_id: UUID;
  exercise_id: UUID;
  position: number;
  target_sets: number | null;
  target_min_reps: number | null;
  target_max_reps: number | null;
  target_weight_kg: number | null;
  source_recommendation_id: UUID | null;
  notes: string | null;
  sync_status: LocalSyncStatus;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  server_updated_at: ISODateTime | null;
};

export type LocalWorkoutSetRow = {
  id: UUID;
  user_id: UUID;
  workout_id: UUID;
  workout_exercise_id: UUID;
  exercise_id: UUID;
  position: number;
  set_type: WorkoutSetType;
  weight_kg: number | null;
  reps: number;
  rpe: RPE | null;
  notes: string | null;
  completed_at: ISODateTime;
  sync_status: LocalSyncStatus;
  deleted_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  server_updated_at: ISODateTime | null;
};

export type LocalWorkoutTemplateRow = {
  id: UUID;
  user_id: UUID;
  name: string;
  notes: string | null;
  is_archived: SQLiteBoolean;
  sync_status: LocalSyncStatus;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  server_updated_at: ISODateTime | null;
};

export type LocalWorkoutTemplateExerciseRow = {
  id: UUID;
  user_id: UUID;
  template_id: UUID;
  exercise_id: UUID;
  position: number;
  target_sets: number;
  target_min_reps: number;
  target_max_reps: number;
  notes: string | null;
  sync_status: LocalSyncStatus;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  server_updated_at: ISODateTime | null;
};

export type LocalExerciseRow = {
  id: UUID;
  owner_user_id: UUID | null;
  name: string;
  primary_muscle_group: MuscleGroup;
  secondary_muscle_groups_json: string;
  equipment_type: EquipmentType;
  measurement_type: MeasurementType;
  is_system: SQLiteBoolean;
  is_archived: SQLiteBoolean;
  sync_status: LocalSyncStatus;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  server_updated_at: ISODateTime | null;
};

export type LocalUserExercisePreferenceRow = {
  id: UUID;
  user_id: UUID;
  exercise_id: UUID;
  is_favorite: SQLiteBoolean;
  notes: string | null;
  rest_duration_seconds: number | null;
  sync_status: LocalSyncStatus;
  deleted_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  server_updated_at: ISODateTime | null;
};

export type LocalProgressionRecommendationRow = {
  id: UUID;
  user_id: UUID;
  exercise_id: UUID;
  source_workout_id: UUID | null;
  source_workout_exercise_id: UUID | null;
  recommendation_type: ProgressionRecommendationType;
  recommended_weight_kg: number | null;
  target_sets: number | null;
  target_min_reps: number | null;
  target_max_reps: number | null;
  target_set_reps_json: string | null;
  confidence: ProgressionConfidence;
  reason_codes_json: string;
  status: "active" | "consumed" | "superseded";
  engine_version: string;
  consumed_at: ISODateTime | null;
  sync_status: LocalSyncStatus;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  server_updated_at: ISODateTime | null;
};
