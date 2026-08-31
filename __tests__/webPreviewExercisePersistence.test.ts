import { WebPreviewLocalExerciseRepository } from "@/db/webPreview/WebPreviewLocalExerciseRepository";
import { WebPreviewLocalUserExercisePreferenceRepository } from "@/db/webPreview/WebPreviewLocalUserExercisePreferenceRepository";
import {
  exerciseWebPreviewStorageKey,
  resetHavAIWebPreviewData,
  type WebPreviewStorage,
} from "@/db/webPreview/storage";
import { developmentExerciseFixture } from "@/features/exercises/fixtures/developmentExerciseFixture";
import {
  archiveCustomExercise,
  createCustomExercise,
  updateCustomExercise,
} from "@/features/exercises/services/customExercises";
import { saveExercisePreference } from "@/features/exercises/services/exercisePreferences";
import { populateExerciseFixture } from "@/features/exercises/services/populateExerciseFixture";

class MemoryStorage implements WebPreviewStorage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const userId = "20000000-0000-4000-8000-000000000001";
const otherUserId = "20000000-0000-4000-8000-000000000002";
const now = "2026-08-31T12:00:00.000Z";

describe("development web preview exercise persistence", () => {
  let storage: MemoryStorage;
  let exercises: WebPreviewLocalExerciseRepository;
  let preferences: WebPreviewLocalUserExercisePreferenceRepository;

  beforeEach(async () => {
    storage = new MemoryStorage();
    exercises = new WebPreviewLocalExerciseRepository(storage);
    preferences = new WebPreviewLocalUserExercisePreferenceRepository(storage);
    await populateExerciseFixture(exercises);
  });

  it("loads the canonical system fixture deterministically", async () => {
    expect(await exercises.listAccessible(userId)).toHaveLength(developmentExerciseFixture.length);
    expect(await exercises.getById(userId, developmentExerciseFixture[0].id))
      .toEqual(developmentExerciseFixture[0]);
  });

  it("persists custom create and edit across repository recreation", async () => {
    const created = await createCustomExercise(exercises, userId, {
      name: "  Preview Press  ",
      primaryMuscleGroup: "chest",
      secondaryMuscleGroups: ["triceps"],
      equipmentType: "dumbbell",
      measurementType: "weight_reps",
    }, now);
    const recreated = new WebPreviewLocalExerciseRepository(storage);
    expect((await recreated.getById(userId, created.id))?.name).toBe("Preview Press");

    await updateCustomExercise(recreated, userId, created.id, {
      name: "Preview Fly",
      primaryMuscleGroup: "chest",
      secondaryMuscleGroups: [],
      equipmentType: "cable",
      measurementType: "weight_reps",
    }, "2026-08-31T12:05:00.000Z");
    expect((await new WebPreviewLocalExerciseRepository(storage).getById(userId, created.id))?.name)
      .toBe("Preview Fly");
  });

  it("keeps archived custom exercises stored but hides them from listings", async () => {
    const created = await createCustomExercise(exercises, userId, {
      name: "Archived Preview Exercise",
      primaryMuscleGroup: "other",
      secondaryMuscleGroups: [],
      equipmentType: "other",
      measurementType: "reps_only",
    }, now);

    await archiveCustomExercise(exercises, userId, created.id);
    expect((await exercises.getById(userId, created.id))?.isArchived).toBe(true);
    expect((await exercises.listAccessible(userId)).map(({ id }) => id)).not.toContain(created.id);
  });

  it("enforces custom exercise and preference ownership", async () => {
    const created = await createCustomExercise(exercises, userId, {
      name: "Owned Exercise",
      primaryMuscleGroup: "back",
      secondaryMuscleGroups: [],
      equipmentType: "barbell",
      measurementType: "weight_reps",
    }, now);

    expect(await exercises.getById(otherUserId, created.id)).toBeNull();
    await expect(preferences.upsert({
      id: "30000000-0000-4000-8000-000000000001",
      userId: otherUserId,
      exerciseId: created.id,
      isFavorite: true,
      createdAt: now,
      updatedAt: now,
    })).rejects.toThrow("inaccessible exercise");
  });

  it("persists favorite, note, and rest override and removes each with fallback semantics", async () => {
    const exercise = developmentExerciseFixture[0];
    await saveExercisePreference(preferences, userId, exercise, {
      isFavorite: true,
      notes: "Keep shoulders down",
      restDurationSeconds: 120,
    }, now);

    let recreated = new WebPreviewLocalUserExercisePreferenceRepository(storage);
    expect(await recreated.get(userId, exercise.id)).toMatchObject({
      isFavorite: true,
      notes: "Keep shoulders down",
      restDurationSeconds: 120,
    });

    await saveExercisePreference(recreated, userId, exercise, { isFavorite: false });
    expect(await recreated.listFavorites(userId)).toEqual([]);
    await saveExercisePreference(recreated, userId, exercise, { notes: null });
    expect(await recreated.get(userId, exercise.id)).toMatchObject({ restDurationSeconds: 120 });
    await saveExercisePreference(recreated, userId, exercise, { restDurationSeconds: null });

    recreated = new WebPreviewLocalUserExercisePreferenceRepository(storage);
    expect(await recreated.get(userId, exercise.id)).toBeNull();
  });

  it("resets only namespaced havAI development data", () => {
    storage.setItem("unrelated:key", "keep");
    storage.setItem("havai:dev:another-preview", "remove");
    expect(storage.getItem(exerciseWebPreviewStorageKey)).not.toBeNull();

    resetHavAIWebPreviewData(storage);

    expect(storage.getItem(exerciseWebPreviewStorageKey)).toBeNull();
    expect(storage.getItem("havai:dev:another-preview")).toBeNull();
    expect(storage.getItem("unrelated:key")).toBe("keep");
  });
});
