const mockFrom = jest.fn();
const mockGetUser = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  SupabaseTemplateRepository,
  TemplateRepositoryError,
  type TemplateRepository,
} from "@/lib/supabase/repositories";
import type { WorkoutTemplate } from "@/shared/contracts";

const userId = "a0000000-0000-4000-8000-00000000000a";
const timestamp = "2026-09-15T13:00:00.000Z";
const template: WorkoutTemplate = {
  id: "fa100000-0000-4000-8000-000000000001",
  userId,
  name: "Push",
  notes: "Cloud template",
  isArchived: false,
  createdAt: timestamp,
  updatedAt: timestamp,
  exercises: [{
    id: "fa110000-0000-4000-8000-000000000001",
    userId,
    templateId: "fa100000-0000-4000-8000-000000000001",
    exerciseId: "10000000-0000-4000-8000-000000000001",
    position: 0,
    targetSets: 3,
    targetMinReps: 8,
    targetMaxReps: 10,
    notes: "Pause",
    createdAt: timestamp,
    updatedAt: timestamp,
  }],
};
const parentRow = {
  id: template.id,
  user_id: userId,
  name: "Push",
  notes: "Cloud template",
  is_archived: false,
  created_at: timestamp,
  updated_at: timestamp,
};
const childRow = {
  id: template.exercises[0].id,
  user_id: userId,
  template_id: template.id,
  exercise_id: template.exercises[0].exerciseId,
  position: 0,
  target_sets: 3,
  target_min_reps: 8,
  target_max_reps: 10,
  notes: "Pause",
  created_at: timestamp,
  updated_at: timestamp,
};

describe("SupabaseTemplateRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
  });

  it("fetches the authenticated user's template graph and ordered children", async () => {
    const parentRange = jest.fn().mockResolvedValue({ data: [parentRow], error: null });
    const childOrder = jest.fn().mockResolvedValue({ data: [childRow], error: null });
    mockFrom.mockImplementation((table: string) => table === "workout_templates"
      ? {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({ range: parentRange })),
          })),
        })),
      }
      : {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            in: jest.fn(() => ({ order: childOrder })),
          })),
        })),
      });

    await expect(new SupabaseTemplateRepository().fetchOwnTemplates()).resolves.toEqual([
      expect.objectContaining({
        template: expect.objectContaining({
          id: template.id,
          userId,
          exercises: [expect.objectContaining({ id: childRow.id, position: 0 })],
        }),
        serverUpdatedAt: timestamp,
      }),
    ]);
    expect(parentRange).toHaveBeenCalledWith(0, 99);
  });

  it("paginates owned template pulls deterministically", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      ...parentRow,
      id: `fa100000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    }));
    const range = jest.fn()
      .mockResolvedValueOnce({ data: firstPage, error: null })
      .mockResolvedValueOnce({ data: [parentRow], error: null });
    mockFrom.mockImplementation((table: string) => table === "workout_templates"
      ? {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({ order: jest.fn(() => ({ range })) })),
        })),
      }
      : {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            in: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
        })),
      });

    await expect(new SupabaseTemplateRepository().fetchOwnTemplates()).resolves.toHaveLength(101);
    expect(range.mock.calls).toEqual([[0, 99], [100, 199]]);
  });

  it("upserts parent and child UUIDs with intentional payloads", async () => {
    const parentSingle = jest.fn().mockResolvedValue({
      data: { updated_at: timestamp }, error: null,
    });
    const childSingle = jest.fn().mockResolvedValue({
      data: { updated_at: timestamp }, error: null,
    });
    const parentUpsert = jest.fn(() => ({
      select: jest.fn(() => ({ single: parentSingle })),
    }));
    const childUpsert = jest.fn(() => ({
      select: jest.fn(() => ({ single: childSingle })),
    }));
    mockFrom.mockImplementation((table: string) => ({
      upsert: table === "workout_templates" ? parentUpsert : childUpsert,
    }));
    const repository = new SupabaseTemplateRepository();

    await expect(repository.upsertOwnTemplate(template)).resolves.toEqual({
      serverUpdatedAt: timestamp,
    });
    await expect(repository.upsertOwnTemplateExercise(template.exercises[0])).resolves.toEqual({
      serverUpdatedAt: timestamp,
    });
    expect(parentUpsert).toHaveBeenCalledWith({
      id: template.id,
      user_id: userId,
      name: "Push",
      notes: "Cloud template",
      is_archived: false,
    }, { onConflict: "id" });
    expect(childUpsert).toHaveBeenCalledWith(expect.objectContaining({
      id: template.exercises[0].id,
      template_id: template.id,
      position: 0,
    }), { onConflict: "id" });
  });

  it("archives through explicit template and owner filters", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { updated_at: timestamp }, error: null,
    });
    const select = jest.fn(() => ({ single }));
    const ownerEq = jest.fn(() => ({ select }));
    const idEq = jest.fn(() => ({ eq: ownerEq }));
    const update = jest.fn(() => ({ eq: idEq }));
    mockFrom.mockReturnValue({ update });

    await expect(new SupabaseTemplateRepository().archiveOwnTemplate(template.id)).resolves
      .toEqual({ serverUpdatedAt: timestamp });
    expect(update).toHaveBeenCalledWith({ is_archived: true });
    expect(idEq).toHaveBeenCalledWith("id", template.id);
    expect(ownerEq).toHaveBeenCalledWith("user_id", userId);
  });

  it("deletes one template exercise through explicit identity and owner filters", async () => {
    const ownerEq = jest.fn().mockResolvedValue({ error: null });
    const idEq = jest.fn(() => ({ eq: ownerEq }));
    const deleteExercise = jest.fn(() => ({ eq: idEq }));
    mockFrom.mockReturnValue({ delete: deleteExercise });

    await expect(
      new SupabaseTemplateRepository().deleteOwnTemplateExercise(template.exercises[0].id),
    ).resolves.toBeUndefined();
    expect(idEq).toHaveBeenCalledWith("id", template.exercises[0].id);
    expect(ownerEq).toHaveBeenCalledWith("user_id", userId);
  });

  it("sanitizes template-exercise delete failures", async () => {
    const ownerEq = jest.fn().mockResolvedValue({ error: { message: "provider detail" } });
    const idEq = jest.fn(() => ({ eq: ownerEq }));
    mockFrom.mockReturnValue({ delete: jest.fn(() => ({ eq: idEq })) });

    const request = new SupabaseTemplateRepository()
      .deleteOwnTemplateExercise(template.exercises[0].id);
    await expect(request).rejects.toMatchObject({
      code: "TEMPLATE_REPOSITORY_ERROR",
      operation: "deleteOwnTemplateExercise",
    });
    await expect(request).rejects.not.toThrow("provider detail");
  });

  it("rejects unauthenticated and cross-owner writes with sanitized errors", async () => {
    const repository = new SupabaseTemplateRepository();
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(repository.fetchOwnTemplates()).rejects.toBeInstanceOf(TemplateRepositoryError);
    expect(mockFrom).not.toHaveBeenCalled();

    const request = repository.upsertOwnTemplate({ ...template, userId: "foreign-user" });
    await expect(request).rejects.toMatchObject({
      code: "TEMPLATE_REPOSITORY_ERROR",
      operation: "upsertOwnTemplate",
    });
    await expect(request).rejects.not.toThrow("foreign-user");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("exposes granular capabilities without a destructive child replacement operation", () => {
    const repository: TemplateRepository = new SupabaseTemplateRepository();
    expect(repository).not.toHaveProperty("replaceChildren");
    expect(repository).not.toHaveProperty("deleteTemplateExercise");
  });
});
