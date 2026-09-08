import { DatabaseSync } from "node:sqlite";

import { fireEvent, render } from "@testing-library/react-native";

import {
  configureLocalDatabase,
  SQLiteLocalTemplateRepository,
  SQLiteLocalWorkoutRepository,
} from "@/db";
import { ActiveExerciseLoggingScreen } from "@/features/workouts/screens/ActiveExerciseLoggingScreen";
import { CompleteSetService } from "@/features/workouts/services/completeSet";
import { SQLiteSetPersistence } from "@/features/workouts/services/setPersistence.native";
import type { ActiveWorkoutExercise } from "@/features/workouts/services/workoutApplication";
import type { WorkoutSet, WorkoutTemplate } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Medium: "medium" },
  impactAsync: jest.fn().mockResolvedValue(undefined),
}));

const time = "2026-09-08T14:00:00.000Z";
const userId = "user-a";

function completedSet(position: number): WorkoutSet {
  return {
    id: `set-${position}`,
    userId,
    workoutId: "workout-1",
    workoutExerciseId: "workout-exercise-1",
    exerciseId: "exercise-1",
    position,
    setType: "working",
    weightKg: 80,
    reps: 8 - position,
    completedAt: time,
    createdAt: time,
    updatedAt: time,
  };
}

function activeExercise(): ActiveWorkoutExercise {
  const sets = [completedSet(0), completedSet(1), completedSet(2)];
  const workoutExercise = {
    id: "workout-exercise-1",
    userId,
    workoutId: "workout-1",
    exerciseId: "exercise-1",
    position: 0,
    targetSets: 3,
    targetMinReps: 6,
    targetMaxReps: 8,
    targetWeightKg: 80,
    sets,
    createdAt: time,
    updatedAt: time,
  };
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
    workout: {
      id: "workout-1",
      userId,
      sourceTemplateId: "template-1",
      name: "Push",
      status: "active",
      startedAt: time,
      exercises: [workoutExercise],
      createdAt: time,
      updatedAt: time,
    },
    workoutExercise,
  };
}

describe("add extra set", () => {
  it("adds a session-only working-set entry and completes it through the existing flow", async () => {
    const snapshot = activeExercise();
    const originalSets = [...snapshot.workoutExercise.sets];
    const completeSet = jest.fn().mockResolvedValue({ set: completedSet(3) });
    const rendered = await render(
      <ActiveExerciseLoggingScreen
        completeSet={completeSet}
        loadExercise={async () => snapshot}
        onOpenExercise={jest.fn()}
        onOverview={jest.fn()}
      />,
    );

    expect(await rendered.findByRole("button", { name: "Add Set" })).toBeTruthy();
    expect(rendered.queryByLabelText("Set input")).toBeNull();
    await fireEvent.press(rendered.getByRole("button", { name: "Add Set" }));
    expect(rendered.getByLabelText("Set input")).toBeTruthy();
    await fireEvent.changeText(rendered.getByLabelText("Reps"), "5");
    await fireEvent.press(rendered.getByRole("button", { name: "Complete Set" }));

    expect(await rendered.findByText("Set 4: 80 kg × 5")).toBeTruthy();
    expect(completeSet).toHaveBeenCalledTimes(1);
    expect(completeSet).toHaveBeenCalledWith(expect.objectContaining({
      exerciseId: "exercise-1",
      setType: "working",
      workoutExerciseId: "workout-exercise-1",
      workoutId: "workout-1",
    }));
    expect(rendered.getByRole("button", { name: "Add Set" })).toBeTruthy();
    expect(snapshot.workoutExercise.targetSets).toBe(3);
    expect(snapshot.workoutExercise.sets).toEqual(originalSets);
  });

  it("persists an extra set after planned sets without changing its source template", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    const template: WorkoutTemplate = {
      id: "template-1",
      userId,
      name: "Push Template",
      isArchived: false,
      exercises: [{
        id: "template-exercise-1",
        userId,
        templateId: "template-1",
        exerciseId: "exercise-1",
        position: 0,
        targetSets: 3,
        targetMinReps: 6,
        targetMaxReps: 8,
        createdAt: time,
        updatedAt: time,
      }],
      createdAt: time,
      updatedAt: time,
    };
    const templateRepository = new SQLiteLocalTemplateRepository(database);
    await templateRepository.create(template);
    const snapshot = activeExercise();
    await new SQLiteLocalWorkoutRepository(database).create(snapshot.workout);

    const result = await new CompleteSetService(new SQLiteSetPersistence(database), {
      createId: () => "set-extra",
      now: () => time,
    }).complete(userId, {
      workoutId: snapshot.workout.id,
      workoutExerciseId: snapshot.workoutExercise.id,
      exerciseId: snapshot.workoutExercise.exerciseId,
      setType: "working",
      weightKg: 80,
      reps: 5,
    });

    expect(result.set).toMatchObject({ id: "set-extra", position: 3, setType: "working" });
    expect((await new SQLiteLocalWorkoutRepository(database).getById(userId, "workout-1"))
      ?.exercises[0].sets.map(({ id }) => id)).toEqual(["set-0", "set-1", "set-2", "set-extra"]);
    expect(await templateRepository.getById(userId, template.id)).toEqual(template);
    await expect(new CompleteSetService(new SQLiteSetPersistence(database)).complete("user-b", {
      workoutId: snapshot.workout.id,
      workoutExerciseId: snapshot.workoutExercise.id,
      exerciseId: snapshot.workoutExercise.exerciseId,
      setType: "working",
      reps: 5,
    })).rejects.toThrow("active workout");
    database.close();
  });
});
