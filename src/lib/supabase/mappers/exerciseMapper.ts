import type { Database } from "@/lib/supabase/database.types";
import type { CloudExerciseSnapshot } from "@/db/repositories";
import type { EquipmentType, MeasurementType, MuscleGroup } from "@/shared/contracts";

type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];
type SecondaryMuscleRow = Database["public"]["Tables"]["exercise_secondary_muscles"]["Row"];

const muscleGroups = [
  "chest", "back", "shoulders", "biceps", "triceps", "quads", "hamstrings",
  "glutes", "calves", "core", "forearms", "full_body", "other",
] as const satisfies readonly MuscleGroup[];
const equipmentTypes = [
  "barbell", "dumbbell", "machine", "cable", "bodyweight", "smith_machine",
  "plate_loaded", "kettlebell", "band", "other",
] as const satisfies readonly EquipmentType[];
const measurementTypes = [
  "weight_reps", "bodyweight_reps", "reps_only",
] as const satisfies readonly MeasurementType[];

export function exerciseFromCloudRows(
  row: ExerciseRow,
  secondaryRows: SecondaryMuscleRow[],
): CloudExerciseSnapshot {
  const primaryMuscleGroup = parseValue(row.primary_muscle_group, muscleGroups, "muscle group");
  const secondaryMuscleGroups = secondaryRows
    .filter(({ exercise_id }) => exercise_id === row.id)
    .map(({ muscle_group }) => parseValue(muscle_group, muscleGroups, "secondary muscle"))
    .sort();
  const equipmentType = parseValue(row.equipment_type, equipmentTypes, "equipment type");
  const measurementType = parseValue(
    row.measurement_type,
    measurementTypes,
    "measurement type",
  );

  if (row.is_system === (row.owner_user_id !== null)) {
    throw new Error("Cloud exercise ownership is invalid.");
  }

  return {
    exercise: {
      id: row.id,
      ownerUserId: row.owner_user_id ?? undefined,
      name: row.name,
      primaryMuscleGroup,
      secondaryMuscleGroups,
      equipmentType,
      measurementType,
      isSystem: row.is_system,
      isArchived: row.is_archived,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    serverUpdatedAt: row.updated_at,
  };
}

function parseValue<T extends string>(
  value: string,
  allowed: readonly T[],
  label: string,
): T {
  if (!allowed.includes(value as T)) throw new Error(`Cloud exercise has an invalid ${label}.`);
  return value as T;
}
