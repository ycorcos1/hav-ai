import { DatabaseSync } from "node:sqlite";

import { act, fireEvent, render, within } from "@testing-library/react-native";

import { configureLocalDatabase, SQLiteLocalWorkoutRepository } from "@/db";
import { WebPreviewLocalWorkoutRepository } from "@/db/webPreview/WebPreviewLocalWorkoutRepository";
import type { WebPreviewStorage } from "@/db/webPreview/storage";
import { readWorkoutWebPreviewState } from "@/db/webPreview/workoutStorage";
import { ActiveExerciseLoggingScreen } from "@/features/workouts/screens/ActiveExerciseLoggingScreen";
import { EditSetError, EditSetService } from "@/features/workouts/services/editSet";
import { SQLiteSetPersistence } from "@/features/workouts/services/setPersistence.native";
import { WebPreviewSetPersistence } from "@/features/workouts/services/setPersistence.web";
import type { ActiveWorkoutExercise } from "@/features/workouts/services/workoutApplication";
import type { Workout, WorkoutSet } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Medium: "medium" },
  impactAsync: jest.fn().mockResolvedValue(undefined),
}));

const time = "2026-09-08T15:00:00.000Z";
const editedAt = "2026-09-08T16:00:00.000Z";
const userId = "user-a";

class MemoryStorage implements WebPreviewStorage {
  private readonly values = new Map<string, string>();
  failWrites = false;
  get length(): number { return this.values.size; }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error("storage failed");
    this.values.set(key, value);
  }
}

function completedSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: "set-1",
    userId,
    workoutId: "workout-1",
    workoutExerciseId: "workout-exercise-1",
    exerciseId: "exercise-1",
    position: 0,
    setType: "working",
    weightKg: 80,
    reps: 8,
    rpe: 8,
    completedAt: time,
    createdAt: time,
    updatedAt: time,
    ...overrides,
  };
}

function workout(set = completedSet()): Workout {
  return {
    id: "workout-1",
    userId,
    name: "Push",
    status: "active",
    startedAt: time,
    exercises: [{
      id: "workout-exercise-1",
      userId,
      workoutId: "workout-1",
      exerciseId: "exercise-1",
      position: 0,
      targetSets: 3,
      sets: [set],
      createdAt: time,
      updatedAt: time,
    }],
    createdAt: time,
    updatedAt: time,
  };
}

function activeExercise(set = completedSet()): ActiveWorkoutExercise {
  const activeWorkout = workout(set);
  return {
    exercise: {
      id: "exercise-1",
      name: "Bench Press",
      primaryMuscleGroup: "chest",
      secondaryMuscleGroups: [],
      equipmentType: "barbell",
      measurementType: "weight_reps",
      isSystem: true,
      isArchived: false,
      createdAt: time,
      updatedAt: time,
    },
    exercisePreference: null,
    profile: {
      userId,
      weightUnit: "kg",
      primaryGoal: "hybrid",
      rpePreference: "optional",
      progressionStyle: "balanced",
      defaultRestDurationSeconds: 120,
      onboardingCompleted: true,
      createdAt: time,
      updatedAt: time,
    },
    previousPerformance: null,
    workout: activeWorkout,
    workoutExercise: activeWorkout.exercises[0],
  };
}

describe("EditSetService", () => {
  it("preserves identity, ownership, order, type, and notes while atomically coalescing native edits", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    const original = completedSet({ notes: "Existing note", setType: "warmup" });
    await new SQLiteLocalWorkoutRepository(database).create(workout(original));
    const persistence = new SQLiteSetPersistence(database);
    const service = new EditSetService(persistence, { now: () => editedAt });

    const first = await service.edit(userId, { setId: original.id, weightKg: 42.5, reps: 10 });
    const second = await service.edit(userId, { setId: original.id, weightKg: 45, reps: 9, rpe: 9 });
    expect(second).toEqual({
      ...original,
      weightKg: 45,
      reps: 9,
      rpe: 9,
      updatedAt: editedAt,
    });
    expect(first.id).toBe(original.id);
    await expect(persistence.setRepository.getById(userId, original.id)).resolves.toEqual(second);
    await expect(database.getAllAsync<{ operation: string }>(
      "SELECT operation FROM sync_queue WHERE entity_type='set' AND entity_id=?;",
      original.id,
    )).resolves.toEqual([{ operation: "upsert" }]);
    database.close();
  });

  it("persists edits across web-preview refresh without changing cloud-known state", async () => {
    const storage = new MemoryStorage();
    const emptyWorkout = workout();
    emptyWorkout.exercises[0].sets = [];
    await new WebPreviewLocalWorkoutRepository(storage).create(emptyWorkout);
    const persistence = new WebPreviewSetPersistence(storage);
    await persistence.commitCompletedSet(completedSet());
    expect(readWorkoutWebPreviewState(storage).setSyncMetadata["set-1"])
      .toEqual({ cloudKnown: false });
    const service = new EditSetService(persistence, { now: () => editedAt });

    const saved = await service.edit(userId, { setId: "set-1", weightKg: 82.5, reps: 7 });
    const refreshed = readWorkoutWebPreviewState(storage);
    expect(refreshed.workouts[0].exercises[0].sets[0]).toEqual(saved);
    expect(refreshed.setSyncMetadata["set-1"]).toEqual({ cloudKnown: false });
    expect(refreshed.queue.filter(({ entityId }) => entityId === "set-1")).toEqual([
      expect.objectContaining({ operation: "upsert" }),
    ]);
  });

  it("rejects invalid, stale, wrong-owner, and inactive-workout edits", async () => {
    const storage = new MemoryStorage();
    const workoutRepository = new WebPreviewLocalWorkoutRepository(storage);
    await workoutRepository.create(workout());
    const service = new EditSetService(new WebPreviewSetPersistence(storage));

    await expect(service.edit(userId, { setId: "set-1", reps: 0 })).rejects
      .toBeInstanceOf(EditSetError);
    await expect(service.edit(userId, { setId: "missing", reps: 8 })).rejects
      .toThrow("no longer available");
    await expect(service.edit("other-user", { setId: "set-1", reps: 8 })).rejects
      .toThrow("no longer available");
    await workoutRepository.update({ ...workout(), status: "completed", completedAt: editedAt });
    await expect(service.edit(userId, { setId: "set-1", reps: 8 })).rejects
      .toThrow("active workout set");
  });

  it("rolls back the native entity update when queue coalescing fails", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    await new SQLiteLocalWorkoutRepository(database).create(workout());
    await database.execAsync(`
      CREATE TRIGGER fail_edit_queue
      BEFORE INSERT ON sync_queue
      WHEN NEW.entity_type='set'
      BEGIN
        SELECT RAISE(FAIL, 'queue unavailable');
      END;
    `);
    const persistence = new SQLiteSetPersistence(database);

    await expect(new EditSetService(persistence, { now: () => editedAt }).edit(userId, {
      setId: "set-1",
      reps: 12,
    })).rejects.toThrow("queue unavailable");
    await expect(persistence.setRepository.getById(userId, "set-1")).resolves.toMatchObject({
      reps: 8,
      updatedAt: time,
    });
    database.close();
  });
});

describe("completed-set editing UI", () => {
  it("edits working and warm-up rows only after local persistence succeeds", async () => {
    const working = completedSet();
    const editSet = jest.fn().mockResolvedValue({
      ...working,
      weightKg: 82.5,
      reps: 9,
      rpe: 9,
      updatedAt: editedAt,
    });
    const rendered = await render(
      <ActiveExerciseLoggingScreen
        completeSet={jest.fn()}
        editSet={editSet}
        loadExercise={async () => activeExercise(working)}
        onOpenExercise={jest.fn()}
        onOverview={jest.fn()}
      />,
    );
    await rendered.findByText("Bench Press");
    await fireEvent.press(rendered.getByRole("button", { name: "Edit Set 1: 80 kg × 8" }));
    const editSheet = within(rendered.getByLabelText("Edit completed set"));
    expect(editSheet.getByLabelText("Reps")).toHaveProp("value", "8");
    expect(editSheet.getByRole("button", { name: "RPE 8" })).toBeTruthy();
    await fireEvent.changeText(editSheet.getByLabelText("Weight (kg)"), "82.5");
    await fireEvent.changeText(editSheet.getByLabelText("Reps"), "9");
    await fireEvent.press(editSheet.getByRole("button", { name: "RPE 8" }));
    await fireEvent.press(editSheet.getByRole("button", { name: "9" }));
    await fireEvent.press(editSheet.getByRole("button", { name: "Save Set" }));
    expect(await rendered.findByRole("button", { name: "Edit Set 1: 82.5 kg × 9" })).toBeTruthy();
    expect(editSet).toHaveBeenCalledWith({ setId: "set-1", weightKg: 82.5, reps: 9, rpe: 9 });

    const warmup = completedSet({ id: "warmup-1", setType: "warmup", weightKg: 40 });
    const warmupRender = await render(
      <ActiveExerciseLoggingScreen
        completeSet={jest.fn()}
        editSet={jest.fn().mockResolvedValue({ ...warmup, reps: 10, updatedAt: editedAt })}
        loadExercise={async () => activeExercise(warmup)}
        onOpenExercise={jest.fn()}
        onOverview={jest.fn()}
      />,
    );
    expect(await warmupRender.findByRole("button", {
      name: "Edit Warm-up 1: 40 kg × 8",
    })).toBeTruthy();
  });

  it("blocks duplicate saves and keeps prior UI values on failure", async () => {
    let resolveSave: ((set: WorkoutSet) => void) | undefined;
    const editSet = jest.fn(() => new Promise<WorkoutSet>((resolve) => {
      resolveSave = resolve;
    }));
    const rendered = await render(
      <ActiveExerciseLoggingScreen
        completeSet={jest.fn()}
        editSet={editSet}
        loadExercise={async () => activeExercise()}
        onOpenExercise={jest.fn()}
        onOverview={jest.fn()}
      />,
    );
    await rendered.findByText("Bench Press");
    await fireEvent.press(rendered.getByRole("button", { name: "Edit Set 1: 80 kg × 8" }));
    const editSheet = within(rendered.getByLabelText("Edit completed set"));
    await fireEvent.changeText(editSheet.getByLabelText("Reps"), "9");
    const save = editSheet.getByRole("button", { name: "Save Set" });
    await fireEvent.press(save);
    await fireEvent.press(save);
    expect(editSet).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveSave?.(completedSet({ reps: 9, updatedAt: editedAt }));
    });
    expect(await rendered.findByRole("button", { name: "Edit Set 1: 80 kg × 9" })).toBeTruthy();

    const failed = await render(
      <ActiveExerciseLoggingScreen
        completeSet={jest.fn()}
        editSet={jest.fn().mockRejectedValue(new Error("private failure"))}
        loadExercise={async () => activeExercise()}
        onOpenExercise={jest.fn()}
        onOverview={jest.fn()}
      />,
    );
    await failed.findByText("Bench Press");
    await fireEvent.press(failed.getByRole("button", { name: "Edit Set 1: 80 kg × 8" }));
    const failedSheet = within(failed.getByLabelText("Edit completed set"));
    await fireEvent.changeText(failedSheet.getByLabelText("Reps"), "10");
    await fireEvent.press(failedSheet.getByRole("button", { name: "Save Set" }));
    expect(await failed.findByText("This set could not be updated. Your previous values were kept."))
      .toBeTruthy();
    expect(failed.getByRole("button", { name: "Edit Set 1: 80 kg × 8" })).toBeTruthy();
    expect(failed.queryByText("private failure")).toBeNull();
  });
});
