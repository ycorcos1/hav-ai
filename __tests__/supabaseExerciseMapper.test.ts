import { exerciseFromCloudRows } from "@/lib/supabase/mappers/exerciseMapper";

const updatedAt = "2026-09-15T13:00:00.000Z";
const row = {
  id: "10000000-0000-4000-8000-000000000001",
  owner_user_id: null,
  name: "Barbell Bench Press",
  primary_muscle_group: "chest",
  equipment_type: "barbell",
  measurement_type: "weight_reps",
  is_system: true,
  is_archived: false,
  created_at: "2026-09-15T12:00:00.000Z",
  updated_at: updatedAt,
};

describe("Supabase exercise mapper", () => {
  it("maps stable IDs, secondary muscles, ownership, archive state, and server metadata", () => {
    expect(exerciseFromCloudRows(row, [
      { exercise_id: row.id, muscle_group: "triceps" },
      { exercise_id: "another-exercise", muscle_group: "back" },
      { exercise_id: row.id, muscle_group: "shoulders" },
    ])).toEqual({
      exercise: {
        id: row.id,
        name: "Barbell Bench Press",
        primaryMuscleGroup: "chest",
        secondaryMuscleGroups: ["shoulders", "triceps"],
        equipmentType: "barbell",
        measurementType: "weight_reps",
        isSystem: true,
        isArchived: false,
        createdAt: row.created_at,
        updatedAt,
      },
      serverUpdatedAt: updatedAt,
    });
  });

  it("maps an archived custom exercise to its owner", () => {
    expect(exerciseFromCloudRows({
      ...row,
      id: "custom-exercise",
      owner_user_id: "user-1",
      is_system: false,
      is_archived: true,
    }, [])).toMatchObject({
      exercise: {
        id: "custom-exercise",
        ownerUserId: "user-1",
        isSystem: false,
        isArchived: true,
      },
    });
  });

  it("rejects invalid cloud enums and ownership shapes", () => {
    expect(() => exerciseFromCloudRows({
      ...row,
      primary_muscle_group: "invalid",
    }, [])).toThrow("invalid muscle group");
    expect(() => exerciseFromCloudRows({ ...row, owner_user_id: "user-1" }, [])).toThrow(
      "Cloud exercise ownership is invalid.",
    );
  });
});
