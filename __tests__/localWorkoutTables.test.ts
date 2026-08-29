import { DatabaseSync } from "node:sqlite";

import { configureLocalDatabase, getLocalSchemaVersion } from "@/db";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const timestamp = "2026-08-29T12:00:00.000Z";

function createDatabase() {
  return new NodeSQLiteConnection(new DatabaseSync(":memory:"));
}

async function insertWorkout(database: NodeSQLiteConnection) {
  await database.runAsync(
    `
      INSERT INTO local_workouts (
        id, user_id, source_template_id, name, status, started_at, completed_at, notes,
        sync_status, created_at, updated_at, server_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    "workout-1",
    "user-1",
    null,
    "Push",
    "active",
    timestamp,
    null,
    "Keep the tempo controlled.",
    "pending_create",
    timestamp,
    timestamp,
    null,
  );
}

describe("local workout tables migration", () => {
  it("supports workout insert, read, update, and delete", async () => {
    const database = createDatabase();

    try {
      await configureLocalDatabase(database);
      await expect(getLocalSchemaVersion(database)).resolves.toBe(5);
      await insertWorkout(database);

      await expect(
        database.getFirstAsync<{ name: string; notes: string }>(
          "SELECT name, notes FROM local_workouts WHERE id = ?;",
          "workout-1",
        ),
      ).resolves.toEqual({ name: "Push", notes: "Keep the tempo controlled." });

      await database.runAsync(
        "UPDATE local_workouts SET name = ?, status = ?, completed_at = ? WHERE id = ?;",
        "Push Updated",
        "completed",
        timestamp,
        "workout-1",
      );
      await expect(
        database.getFirstAsync<{ name: string; status: string }>(
          "SELECT name, status FROM local_workouts WHERE id = ?;",
          "workout-1",
        ),
      ).resolves.toEqual({ name: "Push Updated", status: "completed" });

      await database.runAsync("DELETE FROM local_workouts WHERE id = ?;", "workout-1");
      await expect(
        database.getFirstAsync("SELECT id FROM local_workouts WHERE id = ?;", "workout-1"),
      ).resolves.toBeNull();
    } finally {
      database.close();
    }
  });

  it("preserves ordered exercises, sets, kg values, nullable values, and notes", async () => {
    const database = createDatabase();

    try {
      await configureLocalDatabase(database);
      await insertWorkout(database);

      for (const [id, exerciseId, position, notes] of [
        ["workout-exercise-2", "exercise-2", 1, null],
        ["workout-exercise-1", "exercise-1", 0, "Bench setup note"],
      ] as const) {
        await database.runAsync(
          `
            INSERT INTO local_workout_exercises (
              id, user_id, workout_id, exercise_id, position, target_sets,
              target_min_reps, target_max_reps, target_weight_kg, source_recommendation_id,
              notes, sync_status, created_at, updated_at, server_updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
          `,
          id,
          "user-1",
          "workout-1",
          exerciseId,
          position,
          3,
          6,
          8,
          position === 0 ? 83.9146 : null,
          null,
          notes,
          "pending_create",
          timestamp,
          timestamp,
          null,
        );
      }

      await database.runAsync(
        `
          INSERT INTO local_sets (
            id, user_id, workout_id, workout_exercise_id, exercise_id, position, set_type,
            weight_kg, reps, rpe, notes, completed_at, sync_status, deleted_at,
            created_at, updated_at, server_updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        "set-2",
        "user-1",
        "workout-1",
        "workout-exercise-1",
        "exercise-1",
        1,
        "working",
        null,
        7,
        null,
        null,
        timestamp,
        "pending_create",
        null,
        timestamp,
        timestamp,
        null,
      );
      await database.runAsync(
        `
          INSERT INTO local_sets (
            id, user_id, workout_id, workout_exercise_id, exercise_id, position, set_type,
            weight_kg, reps, rpe, notes, completed_at, sync_status, deleted_at,
            created_at, updated_at, server_updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        "set-1",
        "user-1",
        "workout-1",
        "workout-exercise-1",
        "exercise-1",
        0,
        "working",
        83.9146,
        8,
        8.5,
        "Strong first set",
        timestamp,
        "pending_create",
        null,
        timestamp,
        timestamp,
        null,
      );

      await expect(
        database.getFirstAsync<{ positions: string }>(
          `SELECT GROUP_CONCAT(position, ',') AS positions
           FROM (SELECT position FROM local_workout_exercises ORDER BY position);`,
        ),
      ).resolves.toEqual({ positions: "0,1" });
      await expect(
        database.getFirstAsync<{
          positions: string;
          weight_kg: number;
          notes: string;
        }>(
          `SELECT GROUP_CONCAT(position, ',') AS positions, MAX(weight_kg) AS weight_kg,
                  MAX(notes) AS notes
           FROM (SELECT * FROM local_sets ORDER BY position);`,
        ),
      ).resolves.toEqual({
        positions: "0,1",
        weight_kg: 83.9146,
        notes: "Strong first set",
      });
    } finally {
      database.close();
    }
  });

  it("enforces hierarchy consistency, foreign keys, ordering, and cascades", async () => {
    const database = createDatabase();

    try {
      await configureLocalDatabase(database);
      await insertWorkout(database);
      await database.runAsync(
        `INSERT INTO local_workout_exercises (
          id, user_id, workout_id, exercise_id, position, sync_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        "workout-exercise-1",
        "user-1",
        "workout-1",
        "exercise-1",
        0,
        "pending_create",
        timestamp,
        timestamp,
      );

      await expect(
        database.runAsync(
          `INSERT INTO local_sets (
            id, user_id, workout_id, workout_exercise_id, exercise_id, position, set_type,
            reps, completed_at, sync_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          "invalid-set",
          "user-1",
          "workout-1",
          "workout-exercise-1",
          "different-exercise",
          0,
          "working",
          8,
          timestamp,
          "pending_create",
          timestamp,
          timestamp,
        ),
      ).rejects.toThrow();

      await database.runAsync("DELETE FROM local_workouts WHERE id = ?;", "workout-1");
      await expect(
        database.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) AS count FROM local_workout_exercises;",
        ),
      ).resolves.toEqual({ count: 0 });
    } finally {
      database.close();
    }
  });
});
