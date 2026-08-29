import {
  userExercisePreferenceFromRow,
  userExercisePreferenceToRow,
  workoutSetFromRow,
  workoutSetToRow,
} from "@/db/mappers";
import type { LocalUserExercisePreferenceRow } from "@/db/mappers";
import type { UserExercisePreference, WorkoutSet } from "@/shared/contracts";

const time = "2026-08-29T12:00:00.000Z";

describe("user exercise preference mapper", () => {
  const preference: UserExercisePreference = {
    id: "preference-1", userId: "user-1", exerciseId: "exercise-1",
    isFavorite: true, notes: "Keep elbows tucked", restDurationSeconds: 150,
    createdAt: time, updatedAt: time,
  };

  it("maps favorites, notes, and rest overrides without persistence metadata leakage", () => {
    const row = userExercisePreferenceToRow(preference, { syncStatus: "pending_create" });
    expect(row).toMatchObject({ is_favorite: 1, notes: "Keep elbows tucked", rest_duration_seconds: 150 });
    expect(userExercisePreferenceFromRow(row)).toEqual(preference);
    expect(userExercisePreferenceFromRow({ ...row, notes: null, rest_duration_seconds: null })).toMatchObject({ notes: undefined, restDurationSeconds: undefined });
  });

  it("rejects invalid booleans and non-positive rest overrides", () => {
    const row = userExercisePreferenceToRow(preference, { syncStatus: "pending_create" });
    expect(() => userExercisePreferenceFromRow({ ...row, is_favorite: 2 } as unknown as LocalUserExercisePreferenceRow)).toThrow("Invalid SQLite boolean");
    expect(() => userExercisePreferenceToRow({ ...preference, restDurationSeconds: 0 }, { syncStatus: "pending_create" })).toThrow("must be positive");
  });

  it("retains set notes through the existing set mapper", () => {
    const set: WorkoutSet = { id: "set-1", userId: "user-1", workoutId: "workout-1", workoutExerciseId: "workout-exercise-1", exerciseId: "exercise-1", position: 0, setType: "working", reps: 8, notes: "Set-specific cue", completedAt: time, createdAt: time, updatedAt: time };
    expect(workoutSetFromRow(workoutSetToRow(set, { syncStatus: "pending_create" })).notes).toBe("Set-specific cue");
  });
});
