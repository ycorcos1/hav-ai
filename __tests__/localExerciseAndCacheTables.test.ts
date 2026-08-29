import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { configureLocalDatabase, getLocalSchemaVersion } from "@/db";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const timestamp = "2026-08-29T12:00:00.000Z";

describe("local exercise and recent-session cache migration", () => {
  it("persists distinct system/custom exercises and recent-session cache rows", async () => {
    const directory = mkdtempSync(join(tmpdir(), "havai-exercises-"));
    const filename = join(directory, "exercises.db");

    try {
      const database = new NodeSQLiteConnection(new DatabaseSync(filename));
      await configureLocalDatabase(database);
      await expect(getLocalSchemaVersion(database)).resolves.toBe(5);

      const insertExerciseSql = `
        INSERT INTO local_exercises (
          id, owner_user_id, name, primary_muscle_group, secondary_muscle_groups_json,
          equipment_type, measurement_type, is_system, is_archived, sync_status,
          created_at, updated_at, server_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;
      await database.runAsync(
        insertExerciseSql,
        "exercise-system",
        null,
        "Incline Barbell Bench Press",
        "chest",
        JSON.stringify(["shoulders", "triceps"]),
        "barbell",
        "weight_reps",
        1,
        0,
        "synced",
        timestamp,
        timestamp,
        timestamp,
      );
      await database.runAsync(
        insertExerciseSql,
        "exercise-custom",
        "user-1",
        "Cable Press Variation",
        "chest",
        JSON.stringify(["triceps"]),
        "cable",
        "weight_reps",
        0,
        1,
        "pending_update",
        timestamp,
        timestamp,
        null,
      );
      await database.runAsync(
        `INSERT INTO cached_recent_exercise_sessions (
          id, user_id, exercise_id, workout_id, completed_at, target_sets,
          target_min_reps, target_max_reps, working_sets_json, server_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        "session-1",
        "user-1",
        "exercise-system",
        "workout-cloud-1",
        timestamp,
        null,
        null,
        null,
        JSON.stringify([
          { weightKg: 83.9146, reps: 8, rpe: 8.5 },
          { weightKg: 83.9146, reps: 7 },
        ]),
        null,
      );
      database.close();

      const reopened = new NodeSQLiteConnection(new DatabaseSync(filename));

      try {
        await configureLocalDatabase(reopened);
        await expect(
          reopened.getFirstAsync<{
            owner_user_id: null;
            primary_muscle_group: string;
            equipment_type: string;
            measurement_type: string;
            is_system: number;
            is_archived: number;
            sync_status: string;
            secondary_muscle_groups_json: string;
          }>("SELECT * FROM local_exercises WHERE id = ?;", "exercise-system"),
        ).resolves.toEqual(
          expect.objectContaining({
            owner_user_id: null,
            primary_muscle_group: "chest",
            equipment_type: "barbell",
            measurement_type: "weight_reps",
            is_system: 1,
            is_archived: 0,
            sync_status: "synced",
            secondary_muscle_groups_json: '["shoulders","triceps"]',
          }),
        );
        await expect(
          reopened.getFirstAsync<{
            owner_user_id: string;
            is_system: number;
            is_archived: number;
            sync_status: string;
          }>("SELECT * FROM local_exercises WHERE id = ?;", "exercise-custom"),
        ).resolves.toEqual(
          expect.objectContaining({
            owner_user_id: "user-1",
            is_system: 0,
            is_archived: 1,
            sync_status: "pending_update",
          }),
        );
        await expect(
          reopened.getFirstAsync<{
            target_sets: null;
            working_sets_json: string;
            server_updated_at: null;
          }>("SELECT * FROM cached_recent_exercise_sessions WHERE id = ?;", "session-1"),
        ).resolves.toEqual(
          expect.objectContaining({
            target_sets: null,
            working_sets_json:
              '[{"weightKg":83.9146,"reps":8,"rpe":8.5},{"weightKg":83.9146,"reps":7}]',
            server_updated_at: null,
          }),
        );
      } finally {
        reopened.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("enforces system/custom ownership and confirms cache naming", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));

    try {
      await configureLocalDatabase(database);
      await expect(
        database.runAsync(
          `INSERT INTO local_exercises (
            id, owner_user_id, name, primary_muscle_group, secondary_muscle_groups_json,
            equipment_type, measurement_type, is_system, is_archived, sync_status,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          "invalid-system",
          "user-1",
          "Invalid System Exercise",
          "chest",
          "[]",
          "barbell",
          "weight_reps",
          1,
          0,
          "pending_create",
          timestamp,
          timestamp,
        ),
      ).rejects.toThrow();
      await expect(
        database.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'cached_exercises';",
        ),
      ).resolves.toEqual({ count: 0 });
      await expect(
        database.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) AS count FROM sqlite_master
           WHERE type = 'table'
             AND name IN ('local_workout_templates', 'local_progression_recommendations');`,
        ),
      ).resolves.toEqual({ count: 2 });
    } finally {
      database.close();
    }
  });
});
