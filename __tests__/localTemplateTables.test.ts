import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { configureLocalDatabase, getLocalSchemaVersion } from "@/db";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const timestamp = "2026-08-29T12:00:00.000Z";

function openDatabase(filename: string) {
  return new NodeSQLiteConnection(new DatabaseSync(filename));
}

describe("authoritative local template tables migration", () => {
  it("persists complete offline template data through close and reopen", async () => {
    const directory = mkdtempSync(join(tmpdir(), "havai-templates-"));
    const filename = join(directory, "templates.db");

    try {
      const database = openDatabase(filename);
      await configureLocalDatabase(database);
      await expect(getLocalSchemaVersion(database)).resolves.toBe(6);

      await database.runAsync(
        `INSERT INTO local_workout_templates (
          id, user_id, name, notes, is_archived, sync_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        "template-1",
        "user-1",
        "Push",
        "Primary push session",
        0,
        "pending_create",
        timestamp,
        timestamp,
      );

      for (const [id, exerciseId, position, minReps, maxReps, notes] of [
        ["template-exercise-2", "exercise-2", 1, 8, 10, null],
        ["template-exercise-1", "exercise-1", 0, 6, 8, "Use a low incline"],
      ] as const) {
        await database.runAsync(
          `INSERT INTO local_workout_template_exercises (
            id, user_id, template_id, exercise_id, position, target_sets,
            target_min_reps, target_max_reps, notes, sync_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          id,
          "user-1",
          "template-1",
          exerciseId,
          position,
          3,
          minReps,
          maxReps,
          notes,
          "pending_create",
          timestamp,
          timestamp,
        );
      }
      database.close();

      const reopened = openDatabase(filename);

      try {
        await configureLocalDatabase(reopened);
        await expect(
          reopened.getFirstAsync<{ name: string; notes: string; sync_status: string }>(
            "SELECT name, notes, sync_status FROM local_workout_templates WHERE id = ?;",
            "template-1",
          ),
        ).resolves.toEqual({
          name: "Push",
          notes: "Primary push session",
          sync_status: "pending_create",
        });
        await expect(
          reopened.getFirstAsync<{ positions: string; notes: string }>(
            `SELECT GROUP_CONCAT(position, ',') AS positions, MAX(notes) AS notes
             FROM (SELECT * FROM local_workout_template_exercises ORDER BY position);`,
          ),
        ).resolves.toEqual({ positions: "0,1", notes: "Use a low incline" });

        await reopened.runAsync(
          `UPDATE local_workout_templates
           SET name = ?, notes = ?, is_archived = ?, sync_status = ?, updated_at = ?
           WHERE id = ?;`,
          "Push A",
          "Updated offline",
          1,
          "pending_update",
          timestamp,
          "template-1",
        );
        await expect(
          reopened.getFirstAsync<{ name: string; notes: string; is_archived: number }>(
            "SELECT name, notes, is_archived FROM local_workout_templates WHERE id = ?;",
            "template-1",
          ),
        ).resolves.toEqual({ name: "Push A", notes: "Updated offline", is_archived: 1 });

        await reopened.runAsync("DELETE FROM local_workout_templates WHERE id = ?;", "template-1");
        await expect(
          reopened.getFirstAsync<{ count: number }>(
            "SELECT COUNT(*) AS count FROM local_workout_template_exercises;",
          ),
        ).resolves.toEqual({ count: 0 });
      } finally {
        reopened.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
