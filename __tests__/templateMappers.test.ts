import type { WorkoutTemplate, WorkoutTemplateExercise } from "@/shared/contracts";
import {
  workoutTemplateExerciseFromRow,
  workoutTemplateExerciseToRow,
  workoutTemplateFromRow,
  workoutTemplateToRow,
} from "@/db/mappers";
import type { LocalWorkoutTemplateRow } from "@/db/mappers";

const createdAt = "2026-08-29T12:00:00.000Z";
const updatedAt = "2026-08-29T13:00:00.000Z";
const metadata = { syncStatus: "pending_create" as const };

const exercise: WorkoutTemplateExercise = {
  id: "template-exercise-1",
  userId: "user-1",
  templateId: "template-1",
  exerciseId: "exercise-1",
  position: 3,
  targetSets: 4,
  targetMinReps: 8,
  targetMaxReps: 12,
  notes: "Use a narrow grip",
  createdAt,
  updatedAt,
};

const template: WorkoutTemplate = {
  id: "template-1",
  userId: "user-1",
  name: "Pull",
  notes: "Back emphasis",
  isArchived: true,
  exercises: [exercise],
  createdAt,
  updatedAt,
};

describe("workout template persistence mappers", () => {
  it("maps template exercises in both directions with targets, reps, and order", () => {
    const row = workoutTemplateExerciseToRow(exercise, metadata);

    expect(row).toMatchObject({
      position: 3,
      target_sets: 4,
      target_min_reps: 8,
      target_max_reps: 12,
      notes: "Use a narrow grip",
    });
    expect(workoutTemplateExerciseFromRow(row)).toEqual(exercise);
  });

  it("maps templates in both directions with archive state, notes, and timestamps", () => {
    const row = workoutTemplateToRow(template, metadata);

    expect(row).toMatchObject({
      notes: "Back emphasis",
      is_archived: 1,
      created_at: createdAt,
      updated_at: updatedAt,
    });
    expect(workoutTemplateFromRow(row, [exercise])).toEqual(template);
  });

  it("rejects corrupt SQLite boolean values predictably", () => {
    const row = workoutTemplateToRow(template, metadata);
    const invalid = { ...row, is_archived: 2 } as unknown as LocalWorkoutTemplateRow;

    expect(() => workoutTemplateFromRow(invalid, [])).toThrow(
      "Invalid SQLite boolean for local_workout_templates.is_archived: 2",
    );
  });
});
