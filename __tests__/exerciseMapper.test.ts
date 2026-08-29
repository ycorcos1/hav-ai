import type { Exercise } from "@/shared/contracts";
import { exerciseFromRow, exerciseToRow } from "@/db/mappers";
import type { LocalExerciseRow } from "@/db/mappers";

const createdAt = "2026-08-29T12:00:00.000Z";
const updatedAt = "2026-08-29T13:00:00.000Z";

const systemExercise: Exercise = {
  id: "exercise-system",
  name: "Bench Press",
  primaryMuscleGroup: "chest",
  secondaryMuscleGroups: ["triceps", "shoulders"],
  equipmentType: "barbell",
  measurementType: "weight_reps",
  isSystem: true,
  isArchived: false,
  createdAt,
  updatedAt,
};

const customExercise: Exercise = {
  ...systemExercise,
  id: "exercise-custom",
  ownerUserId: "user-1",
  name: "My Cable Press",
  equipmentType: "cable",
  isSystem: false,
  isArchived: true,
};

describe("exercise persistence mapper", () => {
  it("maps cached system exercises in both directions", () => {
    const row = exerciseToRow(systemExercise, { syncStatus: "synced" });

    expect(row).toMatchObject({
      owner_user_id: null,
      secondary_muscle_groups_json: '["triceps","shoulders"]',
      is_system: 1,
      is_archived: 0,
    });
    expect(exerciseFromRow(row)).toEqual(systemExercise);
  });

  it("maps authoritative custom exercises in both directions", () => {
    const row = exerciseToRow(customExercise, { syncStatus: "pending_create" });

    expect(row).toMatchObject({
      owner_user_id: "user-1",
      is_system: 0,
      is_archived: 1,
      sync_status: "pending_create",
    });
    expect(exerciseFromRow(row)).toEqual(customExercise);
  });

  it("rejects malformed or invalid secondary-muscle persistence", () => {
    const row = exerciseToRow(systemExercise, { syncStatus: "synced" });

    expect(() => exerciseFromRow({ ...row, secondary_muscle_groups_json: "{" })).toThrow(
      "Invalid persisted JSON",
    );
    expect(() =>
      exerciseFromRow({ ...row, secondary_muscle_groups_json: '["not_a_muscle"]' }),
    ).toThrow("Invalid persisted value");
  });

  it("rejects invalid booleans and invalid system/custom ownership", () => {
    const row = exerciseToRow(systemExercise, { syncStatus: "synced" });
    const invalidBoolean = { ...row, is_system: 2 } as unknown as LocalExerciseRow;

    expect(() => exerciseFromRow(invalidBoolean)).toThrow("Invalid SQLite boolean");
    expect(() => exerciseFromRow({ ...row, owner_user_id: "user-1" })).toThrow(
      "System exercises cannot have an owner_user_id.",
    );
    expect(() => exerciseToRow({ ...customExercise, ownerUserId: undefined }, { syncStatus: "pending_create" })).toThrow(
      "Custom exercises require an ownerUserId.",
    );
  });
});
