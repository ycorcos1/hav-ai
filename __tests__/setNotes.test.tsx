import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { fireEvent, render, within } from "@testing-library/react-native";

import { configureLocalDatabase, SQLiteLocalWorkoutRepository } from "@/db";
import { WebPreviewLocalWorkoutRepository } from "@/db/webPreview/WebPreviewLocalWorkoutRepository";
import type { WebPreviewStorage } from "@/db/webPreview/storage";
import {
  markWorkoutWebPreviewSetCloudKnown,
  readWorkoutWebPreviewState,
  writeWorkoutWebPreviewState,
} from "@/db/webPreview/workoutStorage";
import { SetInputRow } from "@/features/workouts/components/SetInputRow";
import { ActiveExerciseLoggingScreen } from "@/features/workouts/screens/ActiveExerciseLoggingScreen";
import { CompleteSetService } from "@/features/workouts/services/completeSet";
import { EditSetService } from "@/features/workouts/services/editSet";
import { SQLiteSetPersistence } from "@/features/workouts/services/setPersistence.native";
import { WebPreviewSetPersistence } from "@/features/workouts/services/setPersistence.web";
import type { ActiveWorkoutExercise } from "@/features/workouts/services/workoutApplication";
import type { Workout, WorkoutSet } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Medium: "medium" },
  impactAsync: jest.fn().mockResolvedValue(undefined),
}));

const time = "2026-09-09T12:00:00.000Z";
const later = "2026-09-09T13:00:00.000Z";
const userId = "user-a";

class MemoryStorage implements WebPreviewStorage {
  private readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
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

function completedSet(notes?: string, setType: WorkoutSet["setType"] = "working"): WorkoutSet {
  return {
    id: "set-1",
    userId,
    workoutId: "workout-1",
    workoutExerciseId: "workout-exercise-1",
    exerciseId: "exercise-1",
    position: 0,
    setType,
    weightKg: 80,
    reps: 8,
    ...(notes === undefined ? {} : { notes }),
    completedAt: time,
    createdAt: time,
    updatedAt: time,
  };
}

function activeExercise(set: WorkoutSet): ActiveWorkoutExercise {
  const activeWorkout = workout([set]);
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
    exercisePreference: {
      id: "preference-1",
      userId,
      exerciseId: "exercise-1",
      isFavorite: false,
      notes: "Seat position four",
      createdAt: time,
      updatedAt: time,
    },
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

describe("set-note draft", () => {
  it("progressively discloses an optional note without persisting before completion", async () => {
    const onComplete = jest.fn();
    const rendered = await render(
      <SetInputRow
        initialWeightKg={80}
        onComplete={onComplete}
        requiresWeight
        rpePreference="hidden"
        weightUnit="kg"
      />,
    );
    expect(rendered.queryByLabelText("Set Note (optional)")).toBeNull();
    await fireEvent.press(rendered.getByRole("button", { name: "Add Set Note" }));
    await fireEvent.changeText(rendered.getByLabelText("Set Note (optional)"), "  Slow eccentric  ");
    expect(onComplete).not.toHaveBeenCalled();
    await fireEvent.press(rendered.getByRole("button", { name: "Increase reps" }));
    await fireEvent.press(rendered.getByRole("button", { name: "Complete Set" }));
    expect(onComplete).toHaveBeenCalledWith({
      notes: "Slow eccentric",
      reps: 1,
      weightKg: 80,
    });
  });

  it("allows completion without a note", async () => {
    const onComplete = jest.fn();
    const rendered = await render(
      <SetInputRow
        initialWeightKg={80}
        onComplete={onComplete}
        requiresWeight
        rpePreference="hidden"
        weightUnit="kg"
      />,
    );
    await fireEvent.press(rendered.getByRole("button", { name: "Increase reps" }));
    await fireEvent.press(rendered.getByRole("button", { name: "Complete Set" }));
    expect(onComplete).toHaveBeenCalledWith({ reps: 1, weightKg: 80 });
  });
});

describe("set-note persistence", () => {
  it("completes and edits notes through the atomic web path while preserving sync metadata", async () => {
    const storage = new MemoryStorage();
    await new WebPreviewLocalWorkoutRepository(storage).create(workout());
    const persistence = new WebPreviewSetPersistence(storage);
    await new CompleteSetService(persistence, {
      createId: () => "set-1",
      now: () => time,
    }).complete(userId, {
      workoutId: "workout-1",
      workoutExerciseId: "workout-exercise-1",
      exerciseId: "exercise-1",
      setType: "warmup",
      weightKg: 40,
      reps: 10,
      notes: "  Shoulder prep  ",
    });
    expect(readWorkoutWebPreviewState(storage).setSyncMetadata["set-1"])
      .toEqual({ cloudKnown: false });
    const state = readWorkoutWebPreviewState(storage);
    markWorkoutWebPreviewSetCloudKnown(state, "set-1");
    state.queue = [];
    writeWorkoutWebPreviewState(storage, state);
    const service = new EditSetService(persistence, { now: () => later });

    await service.edit(userId, { setId: "set-1", reps: 10, weightKg: 40, notes: "New note" });
    await service.edit(userId, { setId: "set-1", reps: 10, weightKg: 40, notes: undefined });
    const refreshed = readWorkoutWebPreviewState(storage);
    expect(refreshed.workouts[0].exercises[0].sets[0]).toMatchObject({
      id: "set-1",
      setType: "warmup",
      reps: 10,
    });
    expect(refreshed.workouts[0].exercises[0].sets[0].notes).toBeUndefined();
    expect(refreshed.setSyncMetadata["set-1"]).toEqual({ cloudKnown: true });
    expect(refreshed.queue.filter(({ entityId }) => entityId === "set-1")).toEqual([
      expect.objectContaining({ operation: "upsert" }),
    ]);
  });

  it("persists a completed and edited note across native SQLite reopen", async () => {
    const directory = mkdtempSync(join(tmpdir(), "havai-set-note-"));
    const filename = join(directory, "workouts.db");
    try {
      const database = new NodeSQLiteConnection(new DatabaseSync(filename));
      await configureLocalDatabase(database);
      await new SQLiteLocalWorkoutRepository(database).create(workout());
      const persistence = new SQLiteSetPersistence(database);
      await new CompleteSetService(persistence, {
        createId: () => "set-1",
        now: () => time,
      }).complete(userId, {
        workoutId: "workout-1",
        workoutExerciseId: "workout-exercise-1",
        exerciseId: "exercise-1",
        setType: "working",
        weightKg: 80,
        reps: 8,
        notes: "First note",
      });
      await new EditSetService(persistence, { now: () => later }).edit(userId, {
        setId: "set-1",
        weightKg: 80,
        reps: 8,
        notes: "Updated note",
      });
      database.close();

      const reopened = new NodeSQLiteConnection(new DatabaseSync(filename));
      await configureLocalDatabase(reopened);
      await expect(new SQLiteSetPersistence(reopened).setRepository.getById(userId, "set-1"))
        .resolves.toMatchObject({ notes: "Updated note" });
      reopened.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe("set-note display and editing", () => {
  it("keeps the set note compact and distinct from the persistent exercise note", async () => {
    const original = completedSet("Pause at the bottom");
    const editSet = jest.fn().mockResolvedValue({ ...original, notes: undefined, updatedAt: later });
    const rendered = await render(
      <ActiveExerciseLoggingScreen
        completeSet={jest.fn()}
        editSet={editSet}
        loadExercise={async () => activeExercise(original)}
        onOpenExercise={jest.fn()}
        onOverview={jest.fn()}
      />,
    );
    await rendered.findByText("Bench Press");
    expect(rendered.getByText("Seat position four")).toBeTruthy();
    expect(rendered.getByLabelText("Note for Set 1: 80 kg × 8")).toHaveTextContent(
      "Set note: Pause at the bottom",
    );
    await fireEvent.press(rendered.getByRole("button", { name: "Edit Set 1: 80 kg × 8" }));
    const sheet = within(rendered.getByLabelText("Edit completed set"));
    expect(sheet.getByLabelText("Set Note (optional)")).toHaveProp(
      "value",
      "Pause at the bottom",
    );
    await fireEvent.changeText(sheet.getByLabelText("Set Note (optional)"), "");
    await fireEvent.press(sheet.getByRole("button", { name: "Save Set" }));
    expect(editSet).toHaveBeenCalledWith(expect.objectContaining({
      setId: "set-1",
      notes: undefined,
    }));
    expect(rendered.queryByLabelText("Note for Set 1: 80 kg × 8")).toBeNull();
  });

  it("does not render note UI for an empty completed-set note", async () => {
    const rendered = await render(
      <ActiveExerciseLoggingScreen
        completeSet={jest.fn()}
        editSet={jest.fn()}
        loadExercise={async () => activeExercise(completedSet())}
        onOpenExercise={jest.fn()}
        onOverview={jest.fn()}
      />,
    );
    await rendered.findByText("Bench Press");
    expect(rendered.queryByText(/^Set note:/)).toBeNull();
  });
});
