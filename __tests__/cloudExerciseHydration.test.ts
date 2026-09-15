import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { configureLocalDatabase, SQLiteLocalExerciseRepository } from "@/db";
import type { CloudExerciseSnapshot } from "@/db/repositories";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const userId = "a0000000-0000-4000-8000-00000000000a";
const createdAt = "2026-09-15T12:00:00.000Z";
const serverUpdatedAt = "2026-09-15T13:00:00.000Z";

function snapshot(id: string, ownerUserId?: string): CloudExerciseSnapshot {
  return {
    exercise: {
      id,
      ownerUserId,
      name: ownerUserId ? "Cloud Custom Press" : "Cloud Bench Press",
      primaryMuscleGroup: "chest",
      secondaryMuscleGroups: ["triceps"],
      equipmentType: "barbell",
      measurementType: "weight_reps",
      isSystem: ownerUserId === undefined,
      isArchived: false,
      createdAt,
      updatedAt: serverUpdatedAt,
    },
    serverUpdatedAt,
  };
}

describe("cloud exercise hydration", () => {
  it("durably hydrates clean cloud-known state without touching the queue", async () => {
    const directory = mkdtempSync(join(tmpdir(), "havai-cloud-exercise-"));
    const filename = join(directory, "exercise.db");
    try {
      const database = new NodeSQLiteConnection(new DatabaseSync(filename));
      await configureLocalDatabase(database);
      const repository = new SQLiteLocalExerciseRepository(database);
      await expect(repository.hydrateFromCloud(userId, snapshot("system-exercise"))).resolves
        .toBe("hydrated");
      await expect(repository.hydrateFromCloud(
        userId,
        snapshot("custom-exercise", userId),
      )).resolves.toBe("hydrated");
      database.close();

      const reopened = new NodeSQLiteConnection(new DatabaseSync(filename));
      try {
        await configureLocalDatabase(reopened);
        await expect(reopened.getAllAsync<{
          id: string;
          server_updated_at: string;
          sync_status: string;
        }>("SELECT id, sync_status, server_updated_at FROM local_exercises ORDER BY id;"))
          .resolves.toEqual([
            { id: "custom-exercise", sync_status: "synced", server_updated_at: serverUpdatedAt },
            { id: "system-exercise", sync_status: "synced", server_updated_at: serverUpdatedAt },
          ]);
        await expect(reopened.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) AS count FROM sync_queue;",
        )).resolves.toEqual({ count: 0 });
      } finally {
        reopened.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("preserves a dirty custom exercise and rejects cross-owner hydration", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    try {
      await configureLocalDatabase(database);
      const repository = new SQLiteLocalExerciseRepository(database);
      const dirty = snapshot("custom-exercise", userId).exercise;
      await repository.upsert({ ...dirty, name: "Local Dirty Press" });

      await expect(repository.hydrateFromCloud(
        userId,
        snapshot("custom-exercise", userId),
      )).resolves.toBe("preserved_dirty");
      await expect(repository.getById(userId, dirty.id)).resolves.toMatchObject({
        name: "Local Dirty Press",
      });
      await expect(repository.hydrateFromCloud(
        "another-user",
        snapshot("other-custom", userId),
      )).rejects.toThrow("Cloud exercise ownership does not match");
      await expect(database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM sync_queue;",
      )).resolves.toEqual({ count: 0 });
    } finally {
      database.close();
    }
  });
});
