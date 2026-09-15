import {
  remoteMutationResultFromRow,
  workoutTemplateExerciseToCloudUpsert,
  workoutTemplateFromCloudRows,
  workoutTemplateToCloudUpsert,
} from "@/lib/supabase/mappers/templateMapper";
import type { WorkoutTemplate } from "@/shared/contracts";

const userId = "a0000000-0000-4000-8000-00000000000a";
const createdAt = "2026-09-15T12:00:00.000Z";
const updatedAt = "2026-09-15T13:00:00.000Z";
const template: WorkoutTemplate = {
  id: "fa100000-0000-4000-8000-000000000001",
  userId,
  name: "Cloud Push",
  notes: "Pressing focus",
  isArchived: false,
  createdAt,
  updatedAt,
  exercises: [{
    id: "fa110000-0000-4000-8000-000000000001",
    userId,
    templateId: "fa100000-0000-4000-8000-000000000001",
    exerciseId: "10000000-0000-4000-8000-000000000001",
    position: 0,
    targetSets: 3,
    targetMinReps: 8,
    targetMaxReps: 10,
    notes: "Controlled eccentric",
    createdAt,
    updatedAt,
  }],
};

const parentRow = {
  id: template.id,
  user_id: userId,
  name: template.name,
  notes: template.notes ?? null,
  is_archived: template.isArchived,
  created_at: createdAt,
  updated_at: updatedAt,
};

function childRow(id: string, position: number) {
  return {
    id,
    user_id: userId,
    template_id: template.id,
    exercise_id: template.exercises[0].exerciseId,
    position,
    target_sets: 3,
    target_min_reps: 8,
    target_max_reps: 10,
    notes: position === 0 ? "Controlled eccentric" : null,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

describe("Supabase template mapper", () => {
  it("maps a complete template graph in canonical 0-based order with server metadata", () => {
    const result = workoutTemplateFromCloudRows(parentRow, [
      childRow("child-2", 1),
      childRow(template.exercises[0].id, 0),
    ]);

    expect(result.template).toMatchObject({
      id: template.id,
      userId,
      name: "Cloud Push",
      exercises: [
        expect.objectContaining({ id: template.exercises[0].id, position: 0 }),
        expect.objectContaining({ id: "child-2", position: 1 }),
      ],
    });
    expect(result.serverUpdatedAt).toBe(updatedAt);
    expect(result.exerciseServerUpdatedAtById).toEqual({
      [template.exercises[0].id]: updatedAt,
      "child-2": updatedAt,
    });
  });

  it("builds intentional parent and child payloads without server metadata", () => {
    expect(workoutTemplateToCloudUpsert(template)).toEqual({
      id: template.id,
      user_id: userId,
      name: "Cloud Push",
      notes: "Pressing focus",
      is_archived: false,
    });
    expect(workoutTemplateExerciseToCloudUpsert(template.exercises[0])).toEqual({
      id: template.exercises[0].id,
      user_id: userId,
      template_id: template.id,
      exercise_id: template.exercises[0].exerciseId,
      position: 0,
      target_sets: 3,
      target_min_reps: 8,
      target_max_reps: 10,
      notes: "Controlled eccentric",
    });
    expect(remoteMutationResultFromRow({ updated_at: updatedAt })).toEqual({
      serverUpdatedAt: updatedAt,
    });
  });

  it("rejects a child owned by another user", () => {
    expect(() => workoutTemplateFromCloudRows(parentRow, [{
      ...childRow("foreign-child", 0),
      user_id: "foreign-user",
    }])).toThrow("Cloud template child ownership is invalid.");
  });
});
