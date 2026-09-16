import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { configureLocalDatabase, SQLiteLocalTemplateRepository } from "@/db";
import type { CloudTemplateSnapshot } from "@/db/repositories";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const userId = "a0000000-0000-4000-8000-00000000000a";
const createdAt = "2026-09-15T12:00:00.000Z";
const serverUpdatedAt = "2026-09-15T13:00:00.000Z";

function snapshot(name = "Cloud Push"): CloudTemplateSnapshot {
  return {
    template: {
      id: "template-cloud",
      userId,
      name,
      notes: "Cloud graph",
      isArchived: false,
      createdAt,
      updatedAt: serverUpdatedAt,
      exercises: [1, 0].map((position) => ({
        id: `template-child-${position}`,
        userId,
        templateId: "template-cloud",
        exerciseId: `exercise-${position}`,
        position,
        targetSets: 3,
        targetMinReps: 8,
        targetMaxReps: 10,
        createdAt,
        updatedAt: serverUpdatedAt,
      })),
    },
    serverUpdatedAt,
    exerciseServerUpdatedAtById: {
      "template-child-0": serverUpdatedAt,
      "template-child-1": serverUpdatedAt,
    },
  };
}

describe("cloud template hydration", () => {
  it("durably hydrates a clean graph without queue mutations or identity changes", async () => {
    const directory = mkdtempSync(join(tmpdir(), "havai-cloud-template-"));
    const filename = join(directory, "template.db");
    try {
      const database = new NodeSQLiteConnection(new DatabaseSync(filename));
      await configureLocalDatabase(database);
      const repository = new SQLiteLocalTemplateRepository(database);
      await expect(repository.hydrateFromCloud(userId, snapshot())).resolves.toBe("hydrated");
      database.close();

      const reopened = new NodeSQLiteConnection(new DatabaseSync(filename));
      try {
        await configureLocalDatabase(reopened);
        await expect(reopened.getFirstAsync<{
          server_updated_at: string;
          sync_status: string;
        }>("SELECT sync_status, server_updated_at FROM local_workout_templates WHERE id=?;", "template-cloud"))
          .resolves.toEqual({ sync_status: "synced", server_updated_at: serverUpdatedAt });
        await expect(reopened.getAllAsync<{
          id: string;
          position: number;
          sync_status: string;
        }>("SELECT id, position, sync_status FROM local_workout_template_exercises ORDER BY position;"))
          .resolves.toEqual([
            { id: "template-child-0", position: 0, sync_status: "synced" },
            { id: "template-child-1", position: 1, sync_status: "synced" },
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

  it("preserves a dirty local template graph", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    try {
      await configureLocalDatabase(database);
      const repository = new SQLiteLocalTemplateRepository(database);
      await repository.create({ ...snapshot("Local Dirty Push").template, updatedAt: createdAt });
      const queueBeforeHydration = await database.getAllAsync(
        "SELECT entity_type, entity_id, operation FROM sync_queue ORDER BY entity_type, entity_id;",
      );

      await expect(repository.hydrateFromCloud(userId, snapshot())).resolves
        .toBe("preserved_dirty");
      await expect(repository.getById(userId, "template-cloud")).resolves.toMatchObject({
        name: "Local Dirty Push",
        exercises: expect.arrayContaining([
          expect.objectContaining({ id: "template-child-0" }),
          expect.objectContaining({ id: "template-child-1" }),
        ]),
      });
      await expect(database.getAllAsync(
        "SELECT entity_type, entity_id, operation FROM sync_queue ORDER BY entity_type, entity_id;",
      )).resolves.toEqual(queueBeforeHydration);
    } finally {
      database.close();
    }
  });

  it("rejects cross-owner graphs and incomplete child metadata", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    try {
      await configureLocalDatabase(database);
      const repository = new SQLiteLocalTemplateRepository(database);
      await expect(repository.hydrateFromCloud("foreign-user", snapshot())).rejects.toThrow(
        "Cloud template ownership or ancestry does not match",
      );
      await expect(repository.hydrateFromCloud(userId, {
        ...snapshot(),
        exerciseServerUpdatedAtById: {},
      })).rejects.toThrow("Cloud template exercise metadata is incomplete.");
      await expect(database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM local_workout_templates;",
      )).resolves.toEqual({ count: 0 });
    } finally {
      database.close();
    }
  });
});
