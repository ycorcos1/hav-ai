import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  configureLocalDatabase,
  getLocalSchemaVersion,
  SQLiteLocalExerciseRepository,
  SQLiteLocalUserExercisePreferenceRepository,
} from "@/db";
import type { UserExercisePreference } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const time = "2026-08-29T12:00:00.000Z";
const later = "2026-08-29T13:00:00.000Z";

async function seedExercises(database: NodeSQLiteConnection) {
  const exercises = new SQLiteLocalExerciseRepository(database);
  await exercises.upsert({ id: "exercise-1", name: "Bench Press", primaryMuscleGroup: "chest", secondaryMuscleGroups: [], equipmentType: "barbell", measurementType: "weight_reps", isSystem: true, isArchived: false, createdAt: time, updatedAt: time });
  await exercises.upsert({ id: "custom-a", ownerUserId: "user-a", name: "Custom A", primaryMuscleGroup: "other", secondaryMuscleGroups: [], equipmentType: "other", measurementType: "reps_only", isSystem: false, isArchived: false, createdAt: time, updatedAt: time });
}

function preference(userId: string, id: string): UserExercisePreference {
  return { id, userId, exerciseId: "exercise-1", isFavorite: true, notes: "Persistent note", restDurationSeconds: 120, createdAt: time, updatedAt: time };
}

describe("local user exercise preferences", () => {
  it("preserves independent user preferences and field updates across reopen", async () => {
    const directory = mkdtempSync(join(tmpdir(), "havai-preferences-"));
    const filename = join(directory, "preferences.db");
    try {
      const database = new NodeSQLiteConnection(new DatabaseSync(filename));
      await configureLocalDatabase(database);
      await seedExercises(database);
      await expect(getLocalSchemaVersion(database)).resolves.toBe(6);
      const repository = new SQLiteLocalUserExercisePreferenceRepository(database);
      await repository.upsert(preference("user-a", "preference-a"));
      await repository.upsert({ ...preference("user-b", "preference-b"), notes: "User B", restDurationSeconds: 90 });
      await repository.upsert({ ...preference("user-a", "custom-preference"), exerciseId: "custom-a", notes: "Custom exercise" });
      await expect(repository.upsert({ ...preference("user-b", "blocked-custom"), exerciseId: "custom-a" })).rejects.toThrow("inaccessible exercise");

      expect(await repository.get("user-a", "exercise-1")).toEqual(preference("user-a", "preference-a"));
      expect((await repository.listFavorites("user-b"))[0].notes).toBe("User B");
      await repository.setNotes("user-a", "preference-a", "Updated note", later);
      expect(await repository.get("user-a", "exercise-1")).toMatchObject({ isFavorite: true, notes: "Updated note", restDurationSeconds: 120 });
      await repository.setFavorite("user-a", "preference-a", false, later);
      expect(await repository.get("user-a", "exercise-1")).toMatchObject({ isFavorite: false, notes: "Updated note", restDurationSeconds: 120 });
      await repository.setRestDuration("user-a", "preference-a", undefined, later);
      expect(await repository.get("user-a", "exercise-1")).toMatchObject({ isFavorite: false, notes: "Updated note", restDurationSeconds: undefined });

      await repository.setNotes("user-b", "preference-a", "stolen", later);
      await repository.deleteOrTombstone("user-b", "preference-a");
      expect((await repository.get("user-a", "exercise-1"))?.notes).toBe("Updated note");
      database.close();

      const reopened = new NodeSQLiteConnection(new DatabaseSync(filename));
      await configureLocalDatabase(reopened);
      const reopenedRepository = new SQLiteLocalUserExercisePreferenceRepository(reopened);
      expect(await reopenedRepository.get("user-a", "exercise-1")).toMatchObject({ isFavorite: false, notes: "Updated note", restDurationSeconds: undefined });
      expect(await reopenedRepository.get("user-b", "exercise-1")).toMatchObject({ notes: "User B", restDurationSeconds: 90 });
      reopened.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("enforces uniqueness, constraints, and canonical tombstones", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    await seedExercises(database);
    const repository = new SQLiteLocalUserExercisePreferenceRepository(database);
    await repository.upsert(preference("user-a", "preference-a"));
    await repository.upsert({ ...preference("user-a", "different-id"), notes: "Single logical row" });
    await expect(database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM local_user_exercise_preferences WHERE user_id=? AND exercise_id=?;", "user-a", "exercise-1")).resolves.toEqual({ count: 1 });

    await repository.deleteOrTombstone("user-a", "preference-a");
    expect(await repository.get("user-a", "exercise-1")).toBeNull();
    await expect(database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM local_user_exercise_preferences WHERE id='preference-a';")).resolves.toEqual({ count: 0 });

    await repository.upsert(preference("user-a", "synced-preference"));
    await database.runAsync("UPDATE local_user_exercise_preferences SET sync_status='synced' WHERE id='synced-preference';");
    await repository.deleteOrTombstone("user-a", "synced-preference");
    await expect(database.getFirstAsync<{ sync_status: string; deleted_at: string | null }>("SELECT sync_status, deleted_at FROM local_user_exercise_preferences WHERE id='synced-preference';")).resolves.toEqual({ sync_status: "pending_delete", deleted_at: expect.any(String) });

    await expect(database.runAsync(`INSERT INTO local_user_exercise_preferences
      (id,user_id,exercise_id,is_favorite,notes,rest_duration_seconds,sync_status,deleted_at,created_at,updated_at,server_updated_at)
      VALUES ('invalid','user-a','exercise-2',2,NULL,0,'pending_create',NULL,?,?,NULL);`, time, time)).rejects.toThrow();
    database.close();
  });
});
