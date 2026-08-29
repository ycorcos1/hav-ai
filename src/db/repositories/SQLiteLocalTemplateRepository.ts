import type { WorkoutTemplate } from "@/shared/contracts";

import { workoutTemplateExerciseFromRow, workoutTemplateExerciseToRow, workoutTemplateFromRow, workoutTemplateToRow } from "../mappers";
import type { LocalWorkoutTemplateExerciseRow, LocalWorkoutTemplateRow } from "../mappers";
import type { LocalDatabaseTransaction, TransactionalLocalDatabaseConnection } from "../types";
import { metadataForUpsert, placeholders } from "./repositoryUtils";
import type { LocalTemplateRepository } from "./types";

const parentColumns = ["id", "user_id", "name", "notes", "is_archived", "sync_status", "created_at", "updated_at", "server_updated_at"];
const childColumns = ["id", "user_id", "template_id", "exercise_id", "position", "target_sets", "target_min_reps", "target_max_reps", "notes", "sync_status", "created_at", "updated_at", "server_updated_at"];

export class SQLiteLocalTemplateRepository implements LocalTemplateRepository {
  constructor(private readonly database: TransactionalLocalDatabaseConnection) {}

  async getById(userId: string, id: string): Promise<WorkoutTemplate | null> {
    const row = await this.database.getFirstAsync<LocalWorkoutTemplateRow>("SELECT * FROM local_workout_templates WHERE id=? AND user_id=?;", id, userId);
    return row ? this.hydrate(row, userId) : null;
  }

  async listForUser(userId: string): Promise<WorkoutTemplate[]> {
    const rows = await this.database.getAllAsync<LocalWorkoutTemplateRow>("SELECT * FROM local_workout_templates WHERE user_id=? ORDER BY updated_at DESC;", userId);
    return Promise.all(rows.map((row) => this.hydrate(row, userId)));
  }

  async create(template: WorkoutTemplate): Promise<void> { await this.save(template); }
  async update(template: WorkoutTemplate): Promise<void> { await this.save(template); }

  private async hydrate(row: LocalWorkoutTemplateRow, userId: string): Promise<WorkoutTemplate> {
    const children = await this.database.getAllAsync<LocalWorkoutTemplateExerciseRow>("SELECT * FROM local_workout_template_exercises WHERE template_id=? AND user_id=? ORDER BY position;", row.id, userId);
    return workoutTemplateFromRow(row, children.map(workoutTemplateExerciseFromRow));
  }

  private async save(template: WorkoutTemplate): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const existing = await transaction.getFirstAsync<{ user_id: string }>(
        "SELECT user_id FROM local_workout_templates WHERE id=?;", template.id,
      );
      if (existing && existing.user_id !== template.userId) return;
      const parent = workoutTemplateToRow(template, await metadataForUpsert(transaction, "local_workout_templates", "user_id", template.userId, template.id));
      await upsertTemplate(transaction, "local_workout_templates", parentColumns, parent, ["name", "notes", "is_archived", "sync_status", "updated_at"]);
      await transaction.runAsync("DELETE FROM local_workout_template_exercises WHERE template_id=? AND user_id=?;", template.id, template.userId);
      for (const exercise of template.exercises) {
        if (exercise.userId !== template.userId || exercise.templateId !== template.id) throw new Error("Template exercise ownership or ancestry does not match its template.");
        const child = workoutTemplateExerciseToRow(exercise, { syncStatus: "pending_create" });
        await transaction.runAsync(`INSERT INTO local_workout_template_exercises (${childColumns.join(", ")}) VALUES (${placeholders(childColumns.length)});`, ...childColumns.map((column) => child[column as keyof LocalWorkoutTemplateExerciseRow]));
      }
    });
  }

  async archive(userId: string, id: string): Promise<void> {
    await this.database.runAsync(`UPDATE local_workout_templates SET is_archived=1,
      sync_status=CASE WHEN sync_status='pending_create' THEN 'pending_create' ELSE 'pending_update' END
      WHERE id=? AND user_id=?;`, id, userId);
  }
}

async function upsertTemplate(database: LocalDatabaseTransaction, table: string, columns: string[], row: object, updates: string[]) {
  const record = row as Record<string, unknown>;
  await database.runAsync(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders(columns.length)})
    ON CONFLICT(id) DO UPDATE SET ${updates.map((column) => `${column}=excluded.${column}`).join(", ")}
    WHERE ${table}.user_id=excluded.user_id;`, ...columns.map((column) => record[column] as never));
}
