import type {
  LocalExerciseRepository,
  LocalTemplateRepository,
} from "@/db/repositories/types";
import { TemplateService } from "@/features/templates/services/templateService";
import type { Exercise, WorkoutTemplate } from "@/shared/contracts";

const now = "2026-08-31T14:00:00.000Z";
const userId = "user-a";
const systemExercise: Exercise = {
  id: "exercise-system",
  name: "Bench Press",
  primaryMuscleGroup: "chest",
  secondaryMuscleGroups: ["triceps"],
  equipmentType: "barbell",
  measurementType: "weight_reps",
  isSystem: true,
  isArchived: false,
  createdAt: now,
  updatedAt: now,
};

function dependencies() {
  const templates = new Map<string, WorkoutTemplate>();
  const templateRepository: LocalTemplateRepository = {
    getById: async (owner, id) => templates.get(id)?.userId === owner ? templates.get(id)! : null,
    listForUser: async (owner) => [...templates.values()].filter((item) => item.userId === owner),
    create: async (template) => { templates.set(template.id, template); },
    update: async (template) => { templates.set(template.id, template); },
    archive: async (owner, id) => {
      const template = templates.get(id);
      if (template?.userId === owner) templates.set(id, { ...template, isArchived: true });
    },
  };
  const exerciseRepository: LocalExerciseRepository = {
    getById: async (owner, id) => id === systemExercise.id
      ? systemExercise
      : id === "exercise-custom" && owner === userId
        ? { ...systemExercise, id, ownerUserId: userId, isSystem: false }
        : null,
    listAccessible: async () => [systemExercise],
    search: async () => [systemExercise],
    upsert: async () => undefined,
    archiveCustomExercise: async () => undefined,
  };
  return { exerciseRepository, templateRepository, templates };
}

const validInput = {
  name: " Push ",
  notes: " Main day ",
  exercises: [{
    exerciseId: systemExercise.id,
    targetSets: 3,
    targetMinReps: 6,
    targetMaxReps: 8,
    notes: " Controlled reps ",
  }],
};

describe("TemplateService", () => {
  it("creates, gets, and lists an owned template with stable ordered configuration", async () => {
    const deps = dependencies();
    const service = new TemplateService(deps);
    const template = await service.create(userId, validInput, now);

    expect(template).toMatchObject({ name: "Push", notes: "Main day", userId });
    expect(template.exercises[0]).toMatchObject({
      position: 0,
      targetSets: 3,
      targetMinReps: 6,
      targetMaxReps: 8,
      notes: "Controlled reps",
    });
    expect(await service.get(userId, template.id)).toEqual(template);
    expect(await service.list(userId)).toEqual([template]);
    expect(await service.get("user-b", template.id)).toBeNull();
  });

  it("edits, duplicates with new IDs, and archives without exposing archived templates", async () => {
    const deps = dependencies();
    const service = new TemplateService(deps);
    const original = await service.create(userId, validInput, now);
    const edited = await service.edit(userId, original.id, {
      ...validInput,
      name: "Push A",
      exercises: [{ ...validInput.exercises[0], id: original.exercises[0].id }],
    }, "2026-08-31T15:00:00.000Z");
    expect(edited.name).toBe("Push A");

    const duplicate = await service.duplicate(userId, original.id, "2026-08-31T16:00:00.000Z");
    expect(duplicate.id).not.toBe(original.id);
    expect(duplicate.exercises[0].id).not.toBe(original.exercises[0].id);
    expect(duplicate.exercises[0]).toMatchObject({ targetSets: 3, targetMinReps: 6, targetMaxReps: 8 });

    await service.archive(userId, original.id);
    expect((await service.get(userId, original.id))?.isArchived).toBe(true);
    expect((await service.list(userId)).map(({ id }) => id)).toEqual([duplicate.id]);
  });

  it("duplicates ownership, exercise configuration, and order without changing the source", async () => {
    const deps = dependencies();
    const service = new TemplateService(deps);
    const original = await service.create(userId, {
      ...validInput,
      exercises: [
        validInput.exercises[0],
        {
          exerciseId: "exercise-custom",
          targetSets: 4,
          targetMinReps: 10,
          targetMaxReps: 12,
          notes: "Slow eccentric",
        },
      ],
    }, now);
    const sourceSnapshot = structuredClone(original);

    const duplicate = await service.duplicate(userId, original.id, "2026-08-31T17:00:00.000Z");

    expect(duplicate.id).not.toBe(original.id);
    expect(duplicate.userId).toBe(userId);
    expect(duplicate.exercises.map(({ exerciseId, position, targetSets, targetMinReps, targetMaxReps, notes }) => ({
      exerciseId, position, targetSets, targetMinReps, targetMaxReps, notes,
    }))).toEqual(original.exercises.map(({ exerciseId, position, targetSets, targetMinReps, targetMaxReps, notes }) => ({
      exerciseId, position, targetSets, targetMinReps, targetMaxReps, notes,
    })));
    expect(duplicate.exercises.map(({ id }) => id)).not.toEqual(original.exercises.map(({ id }) => id));
    expect(new Set(duplicate.exercises.map(({ id }) => id)).size).toBe(duplicate.exercises.length);
    expect(duplicate.exercises.every((item) => item.userId === userId && item.templateId === duplicate.id)).toBe(true);
    expect(await service.get(userId, original.id)).toEqual(sourceSnapshot);
  });

  it("rejects invalid input and inaccessible exercises before persistence", async () => {
    const deps = dependencies();
    const service = new TemplateService(deps);
    await expect(service.create(userId, { ...validInput, name: "" }, now)).rejects.toThrow("workout name");
    await expect(service.create(userId, { ...validInput, exercises: [] }, now)).rejects.toThrow("at least one");
    await expect(service.create(userId, {
      ...validInput,
      exercises: [{ ...validInput.exercises[0], targetMinReps: 10, targetMaxReps: 8 }],
    }, now)).rejects.toThrow("Maximum reps");
    await expect(service.create("user-b", {
      ...validInput,
      exercises: [{ ...validInput.exercises[0], exerciseId: "exercise-custom" }],
    }, now)).rejects.toThrow("not available");
    expect(deps.templates.size).toBe(0);
  });

  it("preserves selected exercise order as contiguous zero-based positions", async () => {
    const deps = dependencies();
    const service = new TemplateService(deps);
    const template = await service.create(userId, {
      ...validInput,
      exercises: [
        validInput.exercises[0],
        { ...validInput.exercises[0], exerciseId: "exercise-custom", targetSets: 4, targetMinReps: 10, targetMaxReps: 12 },
      ],
    }, now);
    expect(template.exercises.map(({ exerciseId, position }) => ({ exerciseId, position }))).toEqual([
      { exerciseId: "exercise-system", position: 0 },
      { exerciseId: "exercise-custom", position: 1 },
    ]);
  });

  it("edits templates without touching workout snapshot data", async () => {
    const deps = dependencies();
    const service = new TemplateService(deps);
    const original = await service.create(userId, validInput, now);
    const workoutSnapshot = Object.freeze({
      id: "workout-1",
      name: original.name,
      targetSets: original.exercises[0].targetSets,
      targetMinReps: original.exercises[0].targetMinReps,
      targetMaxReps: original.exercises[0].targetMaxReps,
    });
    await service.edit(userId, original.id, {
      ...validInput,
      name: "Changed template",
      exercises: [{ ...validInput.exercises[0], id: original.exercises[0].id, targetSets: 5 }],
    }, "2026-08-31T19:00:00.000Z");
    expect(workoutSnapshot).toEqual({ id: "workout-1", name: "Push", targetSets: 3, targetMinReps: 6, targetMaxReps: 8 });
    expect((await service.get(userId, original.id))?.exercises[0]).toMatchObject({ id: original.exercises[0].id, targetSets: 5 });
  });

  it("archives without deleting persisted data or changing historical workout snapshots", async () => {
    const deps = dependencies();
    const service = new TemplateService(deps);
    const original = await service.create(userId, validInput, now);
    const historicalWorkout = Object.freeze({
      id: "workout-1",
      sourceTemplateId: original.id,
      name: original.name,
      exerciseIds: original.exercises.map(({ exerciseId }) => exerciseId),
    });

    await service.archive(userId, original.id);

    expect(await service.list(userId)).toEqual([]);
    expect(await service.get(userId, original.id)).toMatchObject({ id: original.id, isArchived: true });
    expect(historicalWorkout).toEqual({
      id: "workout-1",
      sourceTemplateId: original.id,
      name: "Push",
      exerciseIds: [systemExercise.id],
    });
  });
});
