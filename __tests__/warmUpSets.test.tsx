import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { fireEvent, render } from "@testing-library/react-native";

import {
  configureLocalDatabase,
  SQLiteExerciseHistoryRepository,
  SQLiteLocalSetRepository,
  SQLiteLocalWorkoutRepository,
} from "@/db";
import { WebPreviewExerciseHistoryRepository } from "@/db/webPreview/WebPreviewExerciseHistoryRepository";
import { WebPreviewLocalSetRepository } from "@/db/webPreview/WebPreviewLocalSetRepository";
import { WebPreviewLocalWorkoutRepository } from "@/db/webPreview/WebPreviewLocalWorkoutRepository";
import type { WebPreviewStorage } from "@/db/webPreview/storage";
import { ActiveExerciseLoggingScreen } from "@/features/workouts/screens/ActiveExerciseLoggingScreen";
import { CompleteSetService } from "@/features/workouts/services/completeSet";
import { SQLiteSetPersistence } from "@/features/workouts/services/setPersistence.native";
import { WebPreviewSetPersistence } from "@/features/workouts/services/setPersistence.web";
import type { ActiveWorkoutExercise } from "@/features/workouts/services/workoutApplication";
import type { Workout } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Medium: "medium" },
  impactAsync: jest.fn().mockResolvedValue(undefined),
}));

const time = "2026-09-08T15:00:00.000Z";
const userId = "user-a";

class MemoryStorage implements WebPreviewStorage {
  private readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function workout(): Workout {
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
      targetMinReps: 6,
      targetMaxReps: 8,
      targetWeightKg: 80,
      sets: [],
      createdAt: time,
      updatedAt: time,
    }],
    createdAt: time,
    updatedAt: time,
  };
}

function activeExercise(): ActiveWorkoutExercise {
  const workoutSnapshot = workout();
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
    workout: workoutSnapshot,
    workoutExercise: workoutSnapshot.exercises[0],
  };
}

describe("warm-up sets", () => {
  it("logs and visibly distinguishes a warm-up before returning to working-set entry", async () => {
    const completeSet = jest.fn().mockResolvedValue({
      set: {
        id: "warmup-1",
        userId,
        workoutId: "workout-1",
        workoutExerciseId: "workout-exercise-1",
        exerciseId: "exercise-1",
        position: 0,
        setType: "warmup",
        weightKg: 40,
        reps: 10,
        completedAt: time,
        createdAt: time,
        updatedAt: time,
      },
    });
    const rendered = await render(
      <ActiveExerciseLoggingScreen
        completeSet={completeSet}
        loadExercise={async () => activeExercise()}
        onOpenExercise={jest.fn()}
        onOverview={jest.fn()}
      />,
    );

    await rendered.findByText("Bench Press");
    await fireEvent.press(rendered.getByRole("button", { name: "Add Warm-Up Set" }));
    expect(rendered.getByText("WARM-UP SET")).toBeTruthy();
    await fireEvent.changeText(rendered.getByLabelText("Weight (kg)"), "40");
    await fireEvent.changeText(rendered.getByLabelText("Reps"), "10");
    await fireEvent.press(rendered.getByRole("button", { name: "Complete Set" }));

    expect(await rendered.findByText("Warm-up 1: 40 kg × 10")).toBeTruthy();
    expect(completeSet).toHaveBeenCalledWith(expect.objectContaining({
      setType: "warmup",
      weightKg: 40,
      reps: 10,
    }));
    expect(rendered.queryByText("WARM-UP SET")).toBeNull();
    expect(rendered.getByRole("button", { name: "Add Warm-Up Set" })).toBeTruthy();
  });

  it("preserves warm-up and working types, ordering, and history exclusion across SQLite reopen", async () => {
    const directory = mkdtempSync(join(tmpdir(), "havai-warmup-"));
    const filename = join(directory, "workouts.db");
    try {
      const database = new NodeSQLiteConnection(new DatabaseSync(filename));
      await configureLocalDatabase(database);
      await new SQLiteLocalWorkoutRepository(database).create(workout());
      const persistence = new SQLiteSetPersistence(database);
      await new CompleteSetService(persistence, {
        createId: () => "warmup-1",
        now: () => time,
      }).complete(userId, {
        workoutId: "workout-1",
        workoutExerciseId: "workout-exercise-1",
        exerciseId: "exercise-1",
        setType: "warmup",
        weightKg: 40,
        reps: 10,
      });
      await new CompleteSetService(persistence, {
        createId: () => "working-1",
        now: () => time,
      }).complete(userId, {
        workoutId: "workout-1",
        workoutExerciseId: "workout-exercise-1",
        exerciseId: "exercise-1",
        setType: "working",
        weightKg: 80,
        reps: 8,
      });
      const current = await new SQLiteLocalWorkoutRepository(database).getById(userId, "workout-1");
      await new SQLiteLocalWorkoutRepository(database).update({
        ...current!,
        status: "completed",
        completedAt: time,
      });
      database.close();

      const reopened = new NodeSQLiteConnection(new DatabaseSync(filename));
      await configureLocalDatabase(reopened);
      await expect(new SQLiteLocalSetRepository(reopened).getForWorkoutExercise(
        userId,
        "workout-exercise-1",
      )).resolves.toEqual([
        expect.objectContaining({ id: "warmup-1", position: 0, setType: "warmup" }),
        expect.objectContaining({ id: "working-1", position: 1, setType: "working" }),
      ]);
      await expect(new SQLiteExerciseHistoryRepository(reopened).getRecentSessions({
        userId,
        exerciseId: "exercise-1",
        limit: 1,
      })).resolves.toEqual([{
        workoutId: "workout-1",
        completedAt: time,
        sets: [{ weightKg: 80, reps: 8 }],
      }]);
      reopened.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("preserves equivalent warm-up behavior in web preview without cloud access", async () => {
    const storage = new MemoryStorage();
    const workoutRepository = new WebPreviewLocalWorkoutRepository(storage);
    await workoutRepository.create(workout());
    const persistence = new WebPreviewSetPersistence(storage);
    await new CompleteSetService(persistence, {
      createId: () => "warmup-web",
      now: () => time,
    }).complete(userId, {
      workoutId: "workout-1",
      workoutExerciseId: "workout-exercise-1",
      exerciseId: "exercise-1",
      setType: "warmup",
      reps: 10,
    });
    await new CompleteSetService(persistence, {
      createId: () => "working-web",
      now: () => time,
    }).complete(userId, {
      workoutId: "workout-1",
      workoutExerciseId: "workout-exercise-1",
      exerciseId: "exercise-1",
      setType: "working",
      weightKg: 80,
      reps: 8,
    });

    await expect(new WebPreviewLocalSetRepository(storage).getForWorkoutExercise(
      userId,
      "workout-exercise-1",
    )).resolves.toEqual([
      expect.objectContaining({ id: "warmup-web", position: 0, setType: "warmup" }),
      expect.objectContaining({ id: "working-web", position: 1, setType: "working" }),
    ]);
    const completed = await workoutRepository.getById(userId, "workout-1");
    await workoutRepository.update({ ...completed!, status: "completed", completedAt: time });
    await expect(new WebPreviewExerciseHistoryRepository(storage).getRecentSessions({
      userId,
      exerciseId: "exercise-1",
      limit: 1,
    })).resolves.toEqual([{
      workoutId: "workout-1",
      completedAt: time,
      sets: [{ weightKg: 80, reps: 8 }],
    }]);
  });
});
