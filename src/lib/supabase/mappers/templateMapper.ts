import type { CloudTemplateSnapshot } from "@/db/repositories";
import type { Database } from "@/lib/supabase/database.types";
import type {
  RemoteMutationResult,
  WorkoutTemplate,
  WorkoutTemplateExercise,
} from "@/shared/contracts";

type TemplateTable = Database["public"]["Tables"]["workout_templates"];
type TemplateExerciseTable = Database["public"]["Tables"]["workout_template_exercises"];
type TemplateRow = TemplateTable["Row"];
type TemplateExerciseRow = TemplateExerciseTable["Row"];

export function workoutTemplateFromCloudRows(
  row: TemplateRow,
  childRows: TemplateExerciseRow[],
): CloudTemplateSnapshot {
  const matchingChildren = childRows
    .filter(({ template_id }) => template_id === row.id)
    .sort((left, right) => left.position - right.position);
  if (matchingChildren.some(({ user_id }) => user_id !== row.user_id)) {
    throw new Error("Cloud template child ownership is invalid.");
  }

  return {
    template: {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      notes: row.notes ?? undefined,
      isArchived: row.is_archived,
      exercises: matchingChildren.map(workoutTemplateExerciseFromCloudRow),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    serverUpdatedAt: row.updated_at,
    exerciseServerUpdatedAtById: Object.fromEntries(
      matchingChildren.map((child) => [child.id, child.updated_at]),
    ),
  };
}

export function workoutTemplateToCloudUpsert(
  template: WorkoutTemplate,
): TemplateTable["Insert"] {
  return {
    id: template.id,
    user_id: template.userId,
    name: template.name,
    notes: template.notes ?? null,
    is_archived: template.isArchived,
  };
}

export function workoutTemplateExerciseToCloudUpsert(
  exercise: WorkoutTemplateExercise,
): TemplateExerciseTable["Insert"] {
  return {
    id: exercise.id,
    user_id: exercise.userId,
    template_id: exercise.templateId,
    exercise_id: exercise.exerciseId,
    position: exercise.position,
    target_sets: exercise.targetSets,
    target_min_reps: exercise.targetMinReps,
    target_max_reps: exercise.targetMaxReps,
    notes: exercise.notes ?? null,
  };
}

export function remoteMutationResultFromRow(
  row: Pick<TemplateRow | TemplateExerciseRow, "updated_at">,
): RemoteMutationResult {
  return { serverUpdatedAt: row.updated_at };
}

function workoutTemplateExerciseFromCloudRow(
  row: TemplateExerciseRow,
): WorkoutTemplateExercise {
  return {
    id: row.id,
    userId: row.user_id,
    templateId: row.template_id,
    exerciseId: row.exercise_id,
    position: row.position,
    targetSets: row.target_sets,
    targetMinReps: row.target_min_reps,
    targetMaxReps: row.target_max_reps,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
