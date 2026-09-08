import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { act, fireEvent, render, within } from "@testing-library/react-native";
import { Alert } from "react-native";

import {
  configureLocalDatabase,
  SQLiteExerciseHistoryRepository,
  SQLiteLocalWorkoutRepository,
} from "@/db";
import { WebPreviewLocalWorkoutRepository } from "@/db/webPreview/WebPreviewLocalWorkoutRepository";
import type { WebPreviewStorage } from "@/db/webPreview/storage";
import {
  markWorkoutWebPreviewSetCloudKnown,
  readWorkoutWebPreviewState,
  writeWorkoutWebPreviewState,
} from "@/db/webPreview/workoutStorage";
import { ActiveExerciseLoggingScreen } from "@/features/workouts/screens/ActiveExerciseLoggingScreen";
import { CompleteSetService } from "@/features/workouts/services/completeSet";
import { DeleteSetError, DeleteSetService } from "@/features/workouts/services/deleteSet";
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
const deletedAt = "2026-09-08T17:00:00.000Z";
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

function set(id = "set-1", position = 0, setType: WorkoutSet["setType"] = "working"): WorkoutSet {
  return {
    id,
    userId,
    workoutId: "workout-1",
    workoutExerciseId: "workout-exercise-1",
    exerciseId: "exercise-1",
    position,
    setType,
    weightKg: setType === "warmup" ? 40 : 80,
    reps: 8,
    completedAt: time,
    createdAt: time,
    updatedAt: time,
  };
}

function workout(sets: WorkoutSet[] = []): Workout {
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
      sets,
      createdAt: time,
      updatedAt: time,
    }],
    createdAt: time,
    updatedAt: time,
  };
}

function activeExercise(sets: WorkoutSet[]): ActiveWorkoutExercise {
  const activeWorkout = workout(sets);
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

describe("DeleteSetService persistence", () => {
  it("hard-deletes never-synced web sets without queuing delete", async () => {
    const storage = new MemoryStorage();
    await new WebPreviewLocalWorkoutRepository(storage).create(workout());
    const persistence = new WebPreviewSetPersistence(storage);
    await persistence.commitCompletedSet(set());

    await expect(new DeleteSetService(persistence, { now: () => deletedAt }).delete(userId, "set-1"))
      .resolves.toBe("deleted-local");
    const refreshed = readWorkoutWebPreviewState(storage);
    expect(refreshed.workouts[0].exercises[0].sets).toEqual([]);
    expect(refreshed.deletedSets).toEqual([]);
    expect(refreshed.setSyncMetadata["set-1"]).toBeUndefined();
    expect(refreshed.queue.some(({ entityId }) => entityId === "set-1")).toBe(false);
    await expect(persistence.deleteCompletedSet(userId, "set-1", deletedAt)).resolves.toBe("missing");
  });

  it("tombstones cloud-known web sets with pending edits and coalesces one delete", async () => {
    const storage = new MemoryStorage();
    await new WebPreviewLocalWorkoutRepository(storage).create(workout());
    const persistence = new WebPreviewSetPersistence(storage);
    await persistence.commitCompletedSet(set("warmup-1", 0, "warmup"));
    const synced = readWorkoutWebPreviewState(storage);
    markWorkoutWebPreviewSetCloudKnown(synced, "warmup-1");
    synced.queue = [];
    writeWorkoutWebPreviewState(storage, synced);
    await persistence.commitEditedSet({ ...set("warmup-1", 0, "warmup"), reps: 10 });

    await expect(new DeleteSetService(persistence, { now: () => deletedAt }).delete(
      userId,
      "warmup-1",
    )).resolves.toBe("tombstoned");
    const refreshed = readWorkoutWebPreviewState(storage);
    expect(refreshed.workouts[0].exercises[0].sets).toEqual([]);
    expect(refreshed.deletedSets).toContainEqual(expect.objectContaining({
      id: "warmup-1",
      setType: "warmup",
    }));
    expect(refreshed.setSyncMetadata["warmup-1"]).toEqual({ cloudKnown: true });
    expect(refreshed.queue.filter(({ entityId }) => entityId === "warmup-1")).toEqual([
      expect.objectContaining({ operation: "delete" }),
    ]);
  });

  it("matches native local-only and cloud-known lifecycle and excludes tombstones from history", async () => {
    const directory = mkdtempSync(join(tmpdir(), "havai-delete-set-"));
    const filename = join(directory, "workouts.db");
    try {
      const database = new NodeSQLiteConnection(new DatabaseSync(filename));
      await configureLocalDatabase(database);
      await new SQLiteLocalWorkoutRepository(database).create(workout());
      const persistence = new SQLiteSetPersistence(database);
      const completion = new CompleteSetService(persistence, {
        createId: () => "local-only",
        now: () => time,
      });
      await completion.complete(userId, {
        workoutId: "workout-1",
        workoutExerciseId: "workout-exercise-1",
        exerciseId: "exercise-1",
        setType: "working",
        reps: 8,
      });
      await expect(new DeleteSetService(persistence, { now: () => deletedAt }).delete(
        userId,
        "local-only",
      )).resolves.toBe("deleted-local");

      await persistence.commitCompletedSet(set("cloud-set"));
      await database.runAsync(
        "UPDATE local_sets SET sync_status='synced', server_updated_at=? WHERE id=?;",
        time,
        "cloud-set",
      );
      await persistence.commitEditedSet({ ...set("cloud-set"), reps: 9, updatedAt: deletedAt });
      await expect(new DeleteSetService(persistence, { now: () => deletedAt }).delete(
        userId,
        "cloud-set",
      )).resolves.toBe("tombstoned");
      database.close();

      const reopened = new NodeSQLiteConnection(new DatabaseSync(filename));
      await configureLocalDatabase(reopened);
      const reopenedPersistence = new SQLiteSetPersistence(reopened);
      await expect(reopenedPersistence.setRepository.getForWorkoutExercise(
        userId,
        "workout-exercise-1",
      )).resolves.toEqual([]);
      await expect(reopened.getFirstAsync<{ operation: string }>(
        "SELECT operation FROM sync_queue WHERE entity_type='set' AND entity_id=?;",
        "cloud-set",
      )).resolves.toEqual({ operation: "delete" });
      await reopened.runAsync(
        "UPDATE local_workouts SET status='completed', completed_at=? WHERE id=?;",
        deletedAt,
        "workout-1",
      );
      await expect(new SQLiteExerciseHistoryRepository(reopened).getRecentSessions({
        userId,
        exerciseId: "exercise-1",
        limit: 1,
      })).resolves.toEqual([]);
      reopened.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects stale and wrong-owner requests and rolls back entity plus queue on failure", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    await new SQLiteLocalWorkoutRepository(database).create(workout([set()]));
    const persistence = new SQLiteSetPersistence(database);
    const service = new DeleteSetService(persistence, { now: () => deletedAt });
    await expect(service.delete("other-user", "set-1")).rejects.toBeInstanceOf(DeleteSetError);
    await expect(service.delete(userId, "missing")).rejects.toThrow("no longer available");
    await database.runAsync(
      "UPDATE local_sets SET sync_status='synced', server_updated_at=? WHERE id=?;",
      time,
      "set-1",
    );
    await database.execAsync(`
      CREATE TRIGGER fail_delete_queue
      BEFORE INSERT ON sync_queue
      WHEN NEW.entity_type='set'
      BEGIN
        SELECT RAISE(FAIL, 'queue unavailable');
      END;
    `);

    await expect(service.delete(userId, "set-1")).rejects.toThrow("queue unavailable");
    await expect(persistence.setRepository.getById(userId, "set-1")).resolves.toMatchObject({
      id: "set-1",
    });
    await expect(database.getFirstAsync(
      "SELECT id FROM sync_queue WHERE entity_type='set' AND entity_id=?;",
      "set-1",
    )).resolves.toBeNull();
    database.close();
  });

  it("does not expose a partial web delete when storage fails", async () => {
    const storage = new MemoryStorage();
    await new WebPreviewLocalWorkoutRepository(storage).create(workout());
    const persistence = new WebPreviewSetPersistence(storage);
    await persistence.commitCompletedSet(set());
    storage.failWrites = true;

    await expect(new DeleteSetService(persistence).delete(userId, "set-1"))
      .rejects.toThrow("development workout preview data could not be saved");
    storage.failWrites = false;
    expect(readWorkoutWebPreviewState(storage).workouts[0].exercises[0].sets)
      .toContainEqual(expect.objectContaining({ id: "set-1" }));
    expect(readWorkoutWebPreviewState(storage).queue).toContainEqual(expect.objectContaining({
      entityId: "set-1",
      operation: "upsert",
    }));
  });
});

describe("completed-set deletion UI", () => {
  let confirmDelete: (() => void) | undefined;

  beforeEach(() => {
    confirmDelete = undefined;
    jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
      confirmDelete = buttons?.find(({ style }) => style === "destructive")?.onPress;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("confirms deletion, removes only the saved row, and preserves remaining order", async () => {
    const first = set("set-1", 0);
    const second = set("set-2", 1);
    const deleteSet = jest.fn().mockResolvedValue(undefined);
    const rendered = await render(
      <ActiveExerciseLoggingScreen
        completeSet={jest.fn()}
        deleteSet={deleteSet}
        editSet={jest.fn()}
        loadExercise={async () => activeExercise([first, second])}
        onOpenExercise={jest.fn()}
        onOverview={jest.fn()}
      />,
    );
    await rendered.findByText("Bench Press");
    await fireEvent.press(rendered.getByRole("button", { name: "Edit Set 1: 80 kg × 8" }));
    const sheet = within(rendered.getByLabelText("Edit completed set"));
    await fireEvent.press(sheet.getByRole("button", { name: "Delete Set" }));
    expect(Alert.alert).toHaveBeenCalledWith(
      "Delete set?",
      "This completed set will be removed from the workout.",
      expect.any(Array),
    );
    await act(async () => {
      confirmDelete?.();
    });

    expect(deleteSet).toHaveBeenCalledWith("set-1");
    expect(await rendered.findByRole("button", { name: "Edit Set 1: 80 kg × 8" })).toBeTruthy();
    expect(rendered.queryByRole("button", { name: "Edit Set 2: 80 kg × 8" })).toBeNull();
  });

  it("blocks duplicate confirmation callbacks and preserves the row on failure", async () => {
    let rejectDelete: ((error: Error) => void) | undefined;
    const deleteSet = jest.fn(() => new Promise<void>((_resolve, reject) => {
      rejectDelete = reject;
    }));
    const rendered = await render(
      <ActiveExerciseLoggingScreen
        completeSet={jest.fn()}
        deleteSet={deleteSet}
        editSet={jest.fn()}
        loadExercise={async () => activeExercise([set()])}
        onOpenExercise={jest.fn()}
        onOverview={jest.fn()}
      />,
    );
    await rendered.findByText("Bench Press");
    await fireEvent.press(rendered.getByRole("button", { name: "Edit Set 1: 80 kg × 8" }));
    await fireEvent.press(within(rendered.getByLabelText("Edit completed set"))
      .getByRole("button", { name: "Delete Set" }));
    await act(async () => {
      confirmDelete?.();
      confirmDelete?.();
      rejectDelete?.(new Error("private failure"));
    });

    expect(deleteSet).toHaveBeenCalledTimes(1);
    expect(await rendered.findByText("This set could not be deleted. It remains in your workout."))
      .toBeTruthy();
    expect(rendered.getByRole("button", { name: "Edit Set 1: 80 kg × 8" })).toBeTruthy();
    expect(rendered.queryByText("private failure")).toBeNull();
  });
});
