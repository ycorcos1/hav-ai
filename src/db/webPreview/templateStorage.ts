import type { WorkoutTemplate } from "@/shared/contracts";

import {
  browserWebPreviewStorage,
  type WebPreviewStorage,
  webPreviewStoragePrefix,
} from "./storage";

export const templateWebPreviewStorageKey = `${webPreviewStoragePrefix}template-persistence:v1`;

type TemplateWebPreviewState = {
  templates: WorkoutTemplate[];
  version: 1;
};

export function readTemplateWebPreviewState(
  storage: WebPreviewStorage = browserWebPreviewStorage(),
): TemplateWebPreviewState {
  const serialized = storage.getItem(templateWebPreviewStorageKey);
  if (!serialized) return { templates: [], version: 1 };

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isTemplateState(parsed)) throw new Error("Invalid preview state.");
    return parsed;
  } catch {
    throw new Error("The development template preview data could not be read.");
  }
}

export function writeTemplateWebPreviewState(
  storage: WebPreviewStorage,
  state: TemplateWebPreviewState,
): void {
  try {
    storage.setItem(templateWebPreviewStorageKey, JSON.stringify(state));
  } catch {
    throw new Error("The development template preview data could not be saved.");
  }
}

function isTemplateState(value: unknown): value is TemplateWebPreviewState {
  return isRecord(value)
    && value.version === 1
    && Array.isArray(value.templates)
    && value.templates.every(isTemplate);
}

function isTemplate(value: unknown): value is WorkoutTemplate {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.userId === "string"
    && typeof value.name === "string"
    && (value.notes === undefined || typeof value.notes === "string")
    && typeof value.isArchived === "boolean"
    && typeof value.createdAt === "string"
    && typeof value.updatedAt === "string"
    && Array.isArray(value.exercises)
    && value.exercises.every((exercise) => isRecord(exercise)
      && typeof exercise.id === "string"
      && typeof exercise.userId === "string"
      && typeof exercise.templateId === "string"
      && typeof exercise.exerciseId === "string"
      && typeof exercise.position === "number"
      && typeof exercise.targetSets === "number"
      && typeof exercise.targetMinReps === "number"
      && typeof exercise.targetMaxReps === "number"
      && (exercise.notes === undefined || typeof exercise.notes === "string")
      && typeof exercise.createdAt === "string"
      && typeof exercise.updatedAt === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
