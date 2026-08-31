import { populateExerciseFixture } from "@/features/exercises/services/populateExerciseFixture";
import { authService } from "@/lib/supabase/services";
import type { Exercise, UUID, WorkoutTemplate } from "@/shared/contracts";

import { createTemplatePersistence } from "./templatePersistence";
import { TemplateService } from "./templateService";
import type { SaveTemplateInput } from "./templateService";

export type TemplateDetail = {
  exercises: {
    exercise: Exercise;
    templateExercise: WorkoutTemplate["exercises"][number];
  }[];
  template: WorkoutTemplate;
};

export async function listCurrentUserTemplates(): Promise<WorkoutTemplate[]> {
  const { service, userId } = await serviceForCurrentUser();
  return service.list(userId);
}

export async function getCurrentUserTemplate(id: UUID): Promise<TemplateDetail | null> {
  const { exerciseRepository, service, userId } = await serviceForCurrentUser();
  const template = await service.get(userId, id);
  if (!template) return null;

  const exercises: TemplateDetail["exercises"] = [];
  for (const templateExercise of template.exercises) {
    const exercise = await exerciseRepository.getById(userId, templateExercise.exerciseId);
    if (exercise) exercises.push({ exercise, templateExercise });
  }
  return { exercises, template };
}

export async function createCurrentUserTemplate(
  input: SaveTemplateInput,
): Promise<WorkoutTemplate> {
  const { service, userId } = await serviceForCurrentUser();
  return service.create(userId, input);
}

export async function editCurrentUserTemplate(
  id: UUID,
  input: SaveTemplateInput,
): Promise<WorkoutTemplate> {
  const { service, userId } = await serviceForCurrentUser();
  return service.edit(userId, id, input);
}

export async function duplicateCurrentUserTemplate(
  id: UUID,
): Promise<WorkoutTemplate> {
  const { service, userId } = await serviceForCurrentUser();
  return service.duplicate(userId, id);
}

export async function archiveCurrentUserTemplate(id: UUID): Promise<void> {
  const { service, userId } = await serviceForCurrentUser();
  await service.archive(userId, id);
}

export async function serviceForCurrentUser() {
  const session = await authService.getSession();
  if (!session) throw new Error("Workout templates require an authenticated session.");
  const persistence = await createTemplatePersistence();
  await populateExerciseFixture(persistence.exerciseRepository);
  return {
    ...persistence,
    service: new TemplateService(persistence),
    userId: session.user.id,
  };
}
