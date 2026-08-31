import type { LocalTemplateRepository } from "@/db/repositories/types";
import type { WorkoutTemplate } from "@/shared/contracts";

import {
  browserWebPreviewStorage,
  type WebPreviewStorage,
} from "./storage";
import {
  readTemplateWebPreviewState,
  writeTemplateWebPreviewState,
} from "./templateStorage";

export class WebPreviewLocalTemplateRepository implements LocalTemplateRepository {
  constructor(private readonly storage: WebPreviewStorage = browserWebPreviewStorage()) {}

  async getById(userId: string, id: string): Promise<WorkoutTemplate | null> {
    return readTemplateWebPreviewState(this.storage).templates.find((template) =>
      template.id === id && template.userId === userId) ?? null;
  }

  async listForUser(userId: string): Promise<WorkoutTemplate[]> {
    return readTemplateWebPreviewState(this.storage).templates
      .filter((template) => template.userId === userId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async create(template: WorkoutTemplate): Promise<void> {
    await this.save(template);
  }

  async update(template: WorkoutTemplate): Promise<void> {
    await this.save(template);
  }

  async archive(userId: string, id: string): Promise<void> {
    const state = readTemplateWebPreviewState(this.storage);
    const index = state.templates.findIndex((template) =>
      template.id === id && template.userId === userId);
    if (index < 0) return;
    state.templates[index] = { ...state.templates[index], isArchived: true };
    writeTemplateWebPreviewState(this.storage, state);
  }

  private async save(template: WorkoutTemplate): Promise<void> {
    if (template.exercises.some((exercise) =>
      exercise.userId !== template.userId || exercise.templateId !== template.id)) {
      throw new Error("Template exercise ownership or ancestry does not match its template.");
    }

    const state = readTemplateWebPreviewState(this.storage);
    const index = state.templates.findIndex((stored) => stored.id === template.id);
    if (index >= 0 && state.templates[index].userId !== template.userId) return;
    if (index >= 0) state.templates[index] = template;
    else state.templates.push(template);
    writeTemplateWebPreviewState(this.storage, state);
  }
}
