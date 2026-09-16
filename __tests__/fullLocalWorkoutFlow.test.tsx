import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fireEvent, render } from "@testing-library/react-native";

import { configureLocalDatabase } from "@/db/bootstrap";
import {
  SQLiteExerciseHistoryRepository,
  SQLiteLocalExerciseRepository,
  SQLiteLocalProfileCacheRepository,
  SQLiteLocalRecommendationRepository,
  SQLiteLocalTemplateRepository,
  SQLiteLocalUserExercisePreferenceRepository,
  SQLiteLocalWorkoutRepository,
} from "@/db/repositories";
import { HomeScreen } from "@/features/home/screens/HomeScreen";
import { NetworkStatusProvider } from "@/features/network/components/NetworkStatusProvider";
import type { NetworkStatusService } from "@/features/network/networkStatus";
import { TemplateService } from "@/features/templates/services/templateService";
import { ActiveWorkoutOverviewScreen } from "@/features/workouts/screens/ActiveWorkoutOverviewScreen";
import { SQLiteSetPersistence } from "@/features/workouts/services/setPersistence.native";
import { AuthServiceError, type AuthService } from "@/lib/supabase/services/AuthService";
import type { ProfileRepository } from "@/lib/supabase/repositories/ProfileRepository";
import type { Exercise, UserProfile } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const mockGetSession = jest.fn();
const mockReadStorage = jest.fn();
const mockCreateWorkoutPersistence = jest.fn();
const mockCreateSetPersistence = jest.fn();
const mockCreateProfileCachePersistence = jest.fn();
const mockCreateExercisePersistence = jest.fn();
const mockPopulateExerciseFixture = jest.fn();

jest.mock("@/lib/supabase/services", () => ({
  authService: { getSession: (...args: unknown[]) => mockGetSession(...args) },
}));
jest.mock("@/lib/environment", () => ({
  environment: { supabaseUrl: "https://project.supabase.co" },
}));
jest.mock("@/lib/supabase/authStorage", () => ({
  authStorage: { getItem: (...args: unknown[]) => mockReadStorage(...args) },
}));
jest.mock("@/features/workouts/services/workoutPersistence", () => ({
  createWorkoutPersistence: (...args: unknown[]) => mockCreateWorkoutPersistence(...args),
}));
jest.mock("@/features/workouts/services/setPersistence", () => {
  const actual = jest.requireActual<typeof import("@/features/workouts/services/setPersistence.native")>(
    "@/features/workouts/services/setPersistence.native",
  );
  return {
    ...actual,
    createSetPersistence: (...args: unknown[]) => mockCreateSetPersistence(...args),
  };
});
jest.mock("@/features/profile/services/profileCachePersistence", () => ({
  createProfileCachePersistence: (...args: unknown[]) => mockCreateProfileCachePersistence(...args),
}));
jest.mock("@/features/exercises/services/exercisePersistence", () => ({
  createExercisePersistence: (...args: unknown[]) => mockCreateExercisePersistence(...args),
}));
jest.mock("@/features/exercises/services/populateExerciseFixture", () => ({
  populateExerciseFixture: (...args: unknown[]) => mockPopulateExerciseFixture(...args),
}));

import { recoverLocalStartup, requireCurrentLocalOwner } from "@/features/routing/localRecovery";
import {
  completeCurrentUserSet,
  editCurrentUserSet,
  loadCurrentUserWorkoutHome,
  loadCurrentUserWorkoutOverview,
  requestCurrentUserWorkoutStart,
  updateCurrentUserActiveWorkoutNote,
} from "@/features/workouts/services/workoutApplication";

const userId = "00000000-0000-4000-8000-000000000001";
const exercise: Exercise = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "Bench Press",
  primaryMuscleGroup: "chest",
  secondaryMuscleGroups: ["triceps"],
  equipmentType: "barbell",
  measurementType: "weight_reps",
  isSystem: true,
  isArchived: false,
  createdAt: "2026-09-11T12:00:00.000Z",
  updatedAt: "2026-09-11T12:00:00.000Z",
};
const profile: UserProfile = {
  userId,
  weightUnit: "lb",
  primaryGoal: "hybrid",
  rpePreference: "optional",
  progressionStyle: "balanced",
  defaultRestDurationSeconds: 120,
  onboardingCompleted: true,
  createdAt: "2026-09-11T12:00:00.000Z",
  updatedAt: "2026-09-11T12:00:00.000Z",
};

type QueueRow = {
  attempt_count: number;
  created_at: string;
  entity_id: string;
  entity_type: string;
  id: string;
  last_attempt_at: string | null;
  last_error: string | null;
  operation: string;
};

function repositories(database: NodeSQLiteConnection) {
  return {
    exerciseHistoryRepository: new SQLiteExerciseHistoryRepository(database),
    exerciseRepository: new SQLiteLocalExerciseRepository(database),
    preferenceRepository: new SQLiteLocalUserExercisePreferenceRepository(database),
    profileCacheRepository: new SQLiteLocalProfileCacheRepository(database),
    recommendationRepository: new SQLiteLocalRecommendationRepository(database),
    setPersistence: new SQLiteSetPersistence(database),
    templateRepository: new SQLiteLocalTemplateRepository(database),
    workoutRepository: new SQLiteLocalWorkoutRepository(database),
  };
}

function connectApplication(database: NodeSQLiteConnection): ReturnType<typeof repositories> {
  const local = repositories(database);
  mockCreateWorkoutPersistence.mockResolvedValue(local);
  mockCreateSetPersistence.mockResolvedValue(local.setPersistence);
  mockCreateProfileCachePersistence.mockResolvedValue({
    profileCacheRepository: local.profileCacheRepository,
  });
  mockCreateExercisePersistence.mockResolvedValue({
    exerciseRepository: local.exerciseRepository,
    preferenceRepository: local.preferenceRepository,
  });
  return local;
}

describe("full local workout flow", () => {
  it("survives an offline process boundary through the truthful finish placeholder", async () => {
    const directory = mkdtempSync(join(tmpdir(), "havai-full-local-flow-"));
    const filename = join(directory, "havai.db");
    let database = new NodeSQLiteConnection(new DatabaseSync(filename));
    const remoteProfile: jest.Mocked<ProfileRepository> = {
      createOwnProfile: jest.fn(),
      getOwnProfile: jest.fn(),
      updateOwnProfile: jest.fn(),
    };
    const auth: AuthService = {
      getSession: mockGetSession,
      signIn: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
      subscribeToSession: jest.fn(),
    };
    const persistedSession = JSON.stringify({
      user: { id: userId },
      access_token: "test-access-token",
      refresh_token: "test-refresh-token",
      expires_at: 1,
    });

    try {
      jest.clearAllMocks();
      mockGetSession.mockRejectedValue(new AuthServiceError("getSession", "network_error"));
      mockReadStorage.mockReturnValue(persistedSession);
      await configureLocalDatabase(database);
      let local = connectApplication(database);
      await local.profileCacheRepository.upsert(profile);
      await local.exerciseRepository.upsert(exercise);

      const owner = await requireCurrentLocalOwner();
      expect(owner).toMatchObject({ userId, source: "offline-persisted-owner" });
      const template = await new TemplateService(local).create(userId, {
        name: "Offline Strength",
        notes: "Created and used locally",
        exercises: [{
          exerciseId: exercise.id,
          targetSets: 2,
          targetMinReps: 6,
          targetMaxReps: 8,
          notes: "Pause at the bottom",
        }],
      }, "2026-09-11T12:01:00.000Z");
      owner.assertCurrent();

      const started = await requestCurrentUserWorkoutStart(template.id);
      expect(started.status).toBe("started");
      if (started.status !== "started") throw new Error("Expected the local workout to start.");
      const workout = started.workout;
      const workoutExercise = workout.exercises[0];

      const warmup = await completeCurrentUserSet({
        workoutId: workout.id,
        workoutExerciseId: workoutExercise.id,
        exerciseId: exercise.id,
        setType: "warmup",
        weightKg: 20,
        reps: 10,
        notes: "Warm-up note",
      });
      const firstWorking = await completeCurrentUserSet({
        workoutId: workout.id,
        workoutExerciseId: workoutExercise.id,
        exerciseId: exercise.id,
        setType: "working",
        weightKg: 80,
        reps: 6,
        rpe: 8,
        notes: "Original working note",
      });
      const edited = await editCurrentUserSet({
        setId: firstWorking.set.id,
        weightKg: 82.5,
        reps: 7,
        rpe: 8.5,
        notes: "Edited working note",
      });
      const secondWorking = await completeCurrentUserSet({
        workoutId: workout.id,
        workoutExerciseId: workoutExercise.id,
        exerciseId: exercise.id,
        setType: "working",
        weightKg: 82.5,
        reps: 7,
      });
      const extraWorking = await completeCurrentUserSet({
        workoutId: workout.id,
        workoutExerciseId: workoutExercise.id,
        exerciseId: exercise.id,
        setType: "working",
        weightKg: 77.5,
        reps: 9,
        notes: "Extra set note",
      });

      expect(edited).toMatchObject({
        id: firstWorking.set.id,
        position: 1,
        setType: "working",
        weightKg: 82.5,
        reps: 7,
        rpe: 8.5,
        notes: "Edited working note",
      });
      expect([warmup.set, edited, secondWorking.set, extraWorking.set].map(({ position }) => position))
        .toEqual([0, 1, 2, 3]);

      const queueBeforeClose = await database.getAllAsync<QueueRow>(
        "SELECT * FROM sync_queue ORDER BY entity_type, entity_id;",
      );
      expect(queueBeforeClose.map(({ entity_type }) => entity_type)).toEqual([
        "set",
        "set",
        "set",
        "set",
        "workout",
        "workout_exercise",
        "workout_template",
        "workout_template_exercise",
      ]);
      expect(queueBeforeClose.every(({ attempt_count, last_attempt_at, last_error, operation }) => (
        attempt_count === 0 && last_attempt_at === null && last_error === null && operation === "upsert"
      ))).toBe(true);

      database.close();
      database = new NodeSQLiteConnection(new DatabaseSync(filename));
      await configureLocalDatabase(database);
      local = connectApplication(database);

      await expect(recoverLocalStartup({ authService: auth, profileRepository: remoteProfile }))
        .resolves.toEqual({ status: "local-owner", onboardingComplete: true });
      const recoveredHome = await loadCurrentUserWorkoutHome();
      expect(recoveredHome.activeWorkout?.id).toBe(workout.id);
      expect(recoveredHome.activeWorkout?.exercises).toHaveLength(1);
      expect(recoveredHome.activeWorkout?.exercises[0].sets).toEqual([
        warmup.set,
        edited,
        secondWorking.set,
        extraWorking.set,
      ]);
      expect(await database.getAllAsync<QueueRow>(
        "SELECT * FROM sync_queue ORDER BY entity_type, entity_id;",
      )).toEqual(queueBeforeClose);
      await expect(database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM local_workouts WHERE user_id=?;",
        userId,
      )).resolves.toEqual({ count: 1 });

      const resume = jest.fn();
      const homeScreen = await render(
        <HomeScreen
          discardActiveWorkout={jest.fn()}
          loadHome={loadCurrentUserWorkoutHome}
          onOpenWorkout={resume}
          startWorkout={requestCurrentUserWorkoutStart}
        />,
      );
      expect(await homeScreen.findByText("Workout in Progress")).toBeOnTheScreen();
      await fireEvent.press(homeScreen.getByRole("button", { name: "Resume Workout" }));
      expect(resume).toHaveBeenCalledWith(workout.id);
      await homeScreen.unmount();

      const recoveredOverview = await loadCurrentUserWorkoutOverview(workout.id);
      expect(recoveredOverview?.exercises.map(({ workoutExercise: item }) => item.id))
        .toEqual([workoutExercise.id]);
      const offlineNetwork: NetworkStatusService = {
        getCurrentStatus: async () => "offline",
        subscribe: () => () => undefined,
      };
      const overviewScreen = await render(
        <NetworkStatusProvider service={offlineNetwork}>
          <ActiveWorkoutOverviewScreen
            loadWorkout={async () => recoveredOverview}
            onOpenExercise={jest.fn()}
            saveWorkoutNote={(notes) => updateCurrentUserActiveWorkoutNote({
              workoutId: workout.id,
              notes,
            })}
          />
        </NetworkStatusProvider>,
      );
      expect(await overviewScreen.findByText("Offline · Saved on device")).toBeOnTheScreen();
      expect(overviewScreen.getByText("Bench Press")).toBeOnTheScreen();
      expect(overviewScreen.getByRole("button", { name: "Finish Workout" })).toBeDisabled();
      await overviewScreen.unmount();

      expect(remoteProfile.getOwnProfile).not.toHaveBeenCalled();
      expect(remoteProfile.createOwnProfile).not.toHaveBeenCalled();
      expect(remoteProfile.updateOwnProfile).not.toHaveBeenCalled();
      expect(mockPopulateExerciseFixture).toHaveBeenCalled();
      expect(await local.workoutRepository.getActiveForUser("another-user")).toBeNull();
    } finally {
      database.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
