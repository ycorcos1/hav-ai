import { WebPreviewLocalTemplateRepository } from "@/db/webPreview/WebPreviewLocalTemplateRepository";
import type { WebPreviewStorage } from "@/db/webPreview/storage";
import type { WorkoutTemplate } from "@/shared/contracts";

class MemoryStorage implements WebPreviewStorage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const template: WorkoutTemplate = {
  id: "template-1",
  userId: "user-a",
  name: "Push",
  notes: "Main day",
  isArchived: false,
  exercises: [
    { id: "child-1", userId: "user-a", templateId: "template-1", exerciseId: "exercise-1", position: 0, targetSets: 3, targetMinReps: 6, targetMaxReps: 8, notes: "Pause", createdAt: "2026-08-31T14:00:00.000Z", updatedAt: "2026-08-31T14:00:00.000Z" },
    { id: "child-2", userId: "user-a", templateId: "template-1", exerciseId: "exercise-2", position: 1, targetSets: 4, targetMinReps: 10, targetMaxReps: 12, createdAt: "2026-08-31T14:00:00.000Z", updatedAt: "2026-08-31T14:00:00.000Z" },
  ],
  createdAt: "2026-08-31T14:00:00.000Z",
  updatedAt: "2026-08-31T14:00:00.000Z",
};

describe("development web preview template persistence", () => {
  it("persists owned ordered template configuration across repository recreation", async () => {
    const storage = new MemoryStorage();
    await new WebPreviewLocalTemplateRepository(storage).create(template);
    const recreated = new WebPreviewLocalTemplateRepository(storage);
    expect(await recreated.getById("user-a", template.id)).toEqual(template);
    expect((await recreated.getById("user-a", template.id))?.exercises.map(({ position }) => position)).toEqual([0, 1]);
    expect(await recreated.getById("user-b", template.id)).toBeNull();
    await recreated.archive("user-b", template.id);
    expect((await recreated.getById("user-a", template.id))?.isArchived).toBe(false);
    await recreated.archive("user-a", template.id);
    expect((await recreated.getById("user-a", template.id))?.isArchived).toBe(true);
  });
});
