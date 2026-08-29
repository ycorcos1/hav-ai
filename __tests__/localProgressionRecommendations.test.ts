import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { configureLocalDatabase, getLocalSchemaVersion } from "@/db";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const timestamp = "2026-08-29T12:00:00.000Z";

describe("local progression recommendation migration", () => {
  it("preserves complete recommendation rows and structured arrays across reopen", async () => {
    const directory = mkdtempSync(join(tmpdir(), "havai-recommendations-"));
    const filename = join(directory, "recommendations.db");

    try {
      const database = new NodeSQLiteConnection(new DatabaseSync(filename));
      await configureLocalDatabase(database);
      await expect(getLocalSchemaVersion(database)).resolves.toBe(4);

      const insertSql = `
        INSERT INTO local_progression_recommendations (
          id, user_id, exercise_id, source_workout_id, source_workout_exercise_id,
          recommendation_type, recommended_weight_kg, target_sets, target_min_reps,
          target_max_reps, target_set_reps_json, confidence, reason_codes_json,
          status, engine_version, consumed_at, sync_status, created_at, updated_at,
          server_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;

      await database.runAsync(
        insertSql,
        "recommendation-1",
        "user-1",
        "exercise-1",
        null,
        null,
        "increase_reps",
        83.9146,
        3,
        6,
        8,
        JSON.stringify([8, 7, 7]),
        "high",
        JSON.stringify(["WITHIN_TARGET_RANGE", "TOTAL_REPS_IMPROVED", "RPE_ACCEPTABLE"]),
        "active",
        "progression-v1",
        null,
        "pending_create",
        timestamp,
        timestamp,
        null,
      );
      await database.runAsync(
        insertSql,
        "recommendation-2",
        "user-1",
        "exercise-2",
        null,
        null,
        "insufficient_data",
        null,
        null,
        null,
        null,
        null,
        "low",
        JSON.stringify(["INSUFFICIENT_HISTORY"]),
        "consumed",
        "progression-v1",
        timestamp,
        "synced",
        timestamp,
        timestamp,
        timestamp,
      );
      database.close();

      const reopened = new NodeSQLiteConnection(new DatabaseSync(filename));

      try {
        await configureLocalDatabase(reopened);
        const active = await reopened.getFirstAsync<{
          recommended_weight_kg: number;
          target_sets: number;
          target_min_reps: number;
          target_max_reps: number;
          target_set_reps_json: string;
          confidence: string;
          reason_codes_json: string;
          status: string;
          engine_version: string;
          consumed_at: string | null;
        }>(
          `SELECT recommended_weight_kg, target_sets, target_min_reps, target_max_reps,
                  target_set_reps_json, confidence, reason_codes_json, status,
                  engine_version, consumed_at
           FROM local_progression_recommendations WHERE id = ?;`,
          "recommendation-1",
        );

        expect(active).toEqual({
          recommended_weight_kg: 83.9146,
          target_sets: 3,
          target_min_reps: 6,
          target_max_reps: 8,
          target_set_reps_json: "[8,7,7]",
          confidence: "high",
          reason_codes_json:
            '["WITHIN_TARGET_RANGE","TOTAL_REPS_IMPROVED","RPE_ACCEPTABLE"]',
          status: "active",
          engine_version: "progression-v1",
          consumed_at: null,
        });
        expect(JSON.parse(active?.target_set_reps_json ?? "null")).toEqual([8, 7, 7]);
        expect(JSON.parse(active?.reason_codes_json ?? "null")).toEqual([
          "WITHIN_TARGET_RANGE",
          "TOTAL_REPS_IMPROVED",
          "RPE_ACCEPTABLE",
        ]);
        await expect(
          reopened.getFirstAsync<{ consumed_at: string }>(
            "SELECT consumed_at FROM local_progression_recommendations WHERE id = ?;",
            "recommendation-2",
          ),
        ).resolves.toEqual({ consumed_at: timestamp });
      } finally {
        reopened.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
