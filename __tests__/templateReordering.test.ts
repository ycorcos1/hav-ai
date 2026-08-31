import { DatabaseSync } from "node:sqlite";

import { configureLocalDatabase, SQLiteLocalTemplateRepository } from "@/db";
import { WebPreviewLocalTemplateRepository } from "@/db/webPreview/WebPreviewLocalTemplateRepository";
import type { WebPreviewStorage } from "@/db/webPreview/storage";
import { reorderTemplateExercises } from "@/features/templates/services/reorderTemplateExercises";
import type { TemplateExerciseSelection } from "@/features/templates/screens/NewTemplateScreen";
import type { Exercise, WorkoutTemplate } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const time = "2026-08-31T18:00:00.000Z";
const exercise = (id: string): Exercise => ({
  id, name: id, primaryMuscleGroup: "chest", secondaryMuscleGroups: [], equipmentType: "barbell",
  measurementType: "weight_reps", isSystem: true, isArchived: false, createdAt: time, updatedAt: time,
});
const selections: TemplateExerciseSelection[] = [
  { id: "child-a", exercise: exercise("exercise-a"), exerciseId: "exercise-a", targetSets: 3, targetMinReps: 6, targetMaxReps: 8, notes: "A" },
  { id: "child-b", exercise: exercise("exercise-b"), exerciseId: "exercise-b", targetSets: 4, targetMinReps: 10, targetMaxReps: 12, notes: "B" },
];

function templateFrom(items: TemplateExerciseSelection[]): WorkoutTemplate {
  return {
    id: "template-1", userId: "user-a", name: "Push", isArchived: false, createdAt: time, updatedAt: time,
    exercises: items.map((item, position) => ({
      id: item.id!, userId: "user-a", templateId: "template-1", exerciseId: item.exerciseId,
      position, targetSets: item.targetSets, targetMinReps: item.targetMinReps,
      targetMaxReps: item.targetMaxReps, notes: item.notes, createdAt: time, updatedAt: time,
    })),
  };
}

class MemoryStorage implements WebPreviewStorage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("template exercise reordering", () => {
  it("preserves IDs and configuration while changing order", () => {
    const reordered = reorderTemplateExercises(selections, 1, "up");
    expect(reordered.map(({ id }) => id)).toEqual(["child-b", "child-a"]);
    expect(reordered[0]).toMatchObject({ exerciseId: "exercise-b", targetSets: 4, targetMinReps: 10, targetMaxReps: 12, notes: "B" });
  });

  it("survives native SQLite repository reload with contiguous zero-based positions", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    const repository = new SQLiteLocalTemplateRepository(database);
    await repository.create(templateFrom(selections));
    await repository.update(templateFrom(reorderTemplateExercises(selections, 1, "up")));
    const reloaded = await new SQLiteLocalTemplateRepository(database).getById("user-a", "template-1");
    expect(reloaded?.exercises.map(({ id, position }) => ({ id, position }))).toEqual([
      { id: "child-b", position: 0 }, { id: "child-a", position: 1 },
    ]);
    database.close();
  });

  it("survives web-preview repository recreation equivalently", async () => {
    const storage = new MemoryStorage();
    const repository = new WebPreviewLocalTemplateRepository(storage);
    await repository.create(templateFrom(selections));
    await repository.update(templateFrom(reorderTemplateExercises(selections, 1, "up")));
    const reloaded = await new WebPreviewLocalTemplateRepository(storage).getById("user-a", "template-1");
    expect(reloaded?.exercises.map(({ id, position }) => ({ id, position }))).toEqual([
      { id: "child-b", position: 0 }, { id: "child-a", position: 1 },
    ]);
  });
});
