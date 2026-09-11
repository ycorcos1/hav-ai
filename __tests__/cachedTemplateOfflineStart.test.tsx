import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Text, View } from "react-native";

import { configureLocalDatabase } from "@/db/bootstrap";
import {
  SQLiteExerciseHistoryRepository,
  SQLiteLocalProfileCacheRepository,
  SQLiteLocalRecommendationRepository,
  SQLiteLocalTemplateRepository,
  SQLiteLocalWorkoutRepository,
} from "@/db/repositories";
import { WebPreviewExerciseHistoryRepository } from "@/db/webPreview/WebPreviewExerciseHistoryRepository";
import { WebPreviewLocalProfileCacheRepository } from "@/db/webPreview/WebPreviewLocalProfileCacheRepository";
import { WebPreviewLocalRecommendationRepository } from "@/db/webPreview/WebPreviewLocalRecommendationRepository";
import { WebPreviewLocalTemplateRepository } from "@/db/webPreview/WebPreviewLocalTemplateRepository";
import { WebPreviewLocalWorkoutRepository } from "@/db/webPreview/WebPreviewLocalWorkoutRepository";
import type { WebPreviewStorage } from "@/db/webPreview/storage";
import { readWorkoutWebPreviewState } from "@/db/webPreview/workoutStorage";
import { HomeScreen } from "@/features/home/screens/HomeScreen";
import {
  NetworkStatusProvider,
  useNetworkStatus,
} from "@/features/network/components/NetworkStatusProvider";
import type { NetworkStatus, NetworkStatusService } from "@/features/network/networkStatus";
import { AuthServiceError } from "@/lib/supabase/services/AuthService";
import type { ProgressionRecommendation, UserProfile, WorkoutTemplate } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const mockGetSession = jest.fn();
const mockReadStorage = jest.fn();
const mockCreateWorkoutPersistence = jest.fn();
const mockCreateProfileCachePersistence = jest.fn();
const mockEnsureProfile = jest.fn();

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
jest.mock("@/features/profile/services/profileCachePersistence", () => ({
  createProfileCachePersistence: (...args: unknown[]) => mockCreateProfileCachePersistence(...args),
}));
jest.mock("@/features/profile/useCases/ensureProfile", () => ({
  ensureProfile: (...args: unknown[]) => mockEnsureProfile(...args),
}));

import {
  loadCurrentUserWorkoutHome,
  requestCurrentUserWorkoutStart,
} from "@/features/workouts/services/workoutApplication";

const now = "2026-09-11T12:00:00.000Z";
const userId = "00000000-0000-4000-8000-000000000001";
const template: WorkoutTemplate = {
  id: "00000000-0000-4000-8000-000000000002",
  userId,
  name: "Offline Push",
  isArchived: false,
  exercises: [
    {
      id: "00000000-0000-4000-8000-000000000004",
      userId,
      templateId: "00000000-0000-4000-8000-000000000002",
      exerciseId: "00000000-0000-4000-8000-000000000006",
      position: 1,
      targetSets: 4,
      targetMinReps: 10,
      targetMaxReps: 12,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "00000000-0000-4000-8000-000000000003",
      userId,
      templateId: "00000000-0000-4000-8000-000000000002",
      exerciseId: "00000000-0000-4000-8000-000000000005",
      position: 0,
      targetSets: 3,
      targetMinReps: 6,
      targetMaxReps: 8,
      createdAt: now,
      updatedAt: now,
    },
  ],
  createdAt: now,
  updatedAt: now,
};
const recommendation: ProgressionRecommendation = {
  id: "00000000-0000-4000-8000-000000000007",
  userId,
  exerciseId: "00000000-0000-4000-8000-000000000005",
  recommendationType: "increase_weight",
  recommendedWeightKg: 82.5,
  targetSets: 3,
  targetMinReps: 6,
  targetMaxReps: 7,
  confidence: "high",
  reasonCodes: ["TOP_OF_REP_RANGE_REACHED"],
  status: "active",
  engineVersion: "v1",
  createdAt: now,
  updatedAt: now,
};
const profile: UserProfile = {
  userId,
  weightUnit: "lb",
  primaryGoal: "hybrid",
  rpePreference: "optional",
  progressionStyle: "balanced",
  defaultRestDurationSeconds: 120,
  onboardingCompleted: true,
  createdAt: now,
  updatedAt: now,
};

class MemoryStorage implements WebPreviewStorage {
  private readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function NetworkStatusProbe(): React.JSX.Element {
  return <Text>{useNetworkStatus()}</Text>;
}

describe("cached template offline start", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockRejectedValue(new AuthServiceError("getSession", "network_error"));
    mockReadStorage.mockReturnValue(JSON.stringify({
      user: { id: userId },
      access_token: "test-access-token",
      refresh_token: "test-refresh-token",
      expires_at: 1,
    }));
  });

  it("starts and durably queues the complete native snapshot when cloud access is unavailable", async () => {
    const directory = mkdtempSync(join(tmpdir(), "havai-offline-start-"));
    const filename = join(directory, "offline-start.db");
    let database = new NodeSQLiteConnection(new DatabaseSync(filename));

    try {
      await configureLocalDatabase(database);
      const profiles = new SQLiteLocalProfileCacheRepository(database);
      const templates = new SQLiteLocalTemplateRepository(database);
      const recommendations = new SQLiteLocalRecommendationRepository(database);
      await profiles.upsert(profile);
      await templates.create(structuredClone(template));
      await recommendations.upsert(recommendation);
      await database.runAsync("DELETE FROM sync_queue;");

      mockCreateProfileCachePersistence.mockResolvedValue({ profileCacheRepository: profiles });
      mockCreateWorkoutPersistence.mockResolvedValue({
        exerciseHistoryRepository: new SQLiteExerciseHistoryRepository(database),
        recommendationRepository: recommendations,
        templateRepository: templates,
        workoutRepository: new SQLiteLocalWorkoutRepository(database),
      });

      const result = await requestCurrentUserWorkoutStart(template.id);
      expect(result.status).toBe("started");
      if (result.status !== "started") throw new Error("Expected the cached template to start.");
      expect(result.workout).toMatchObject({ userId, sourceTemplateId: template.id, name: template.name });
      expect(result.workout.exercises.map(({ exerciseId, position }) => ({ exerciseId, position }))).toEqual([
        { exerciseId: template.exercises[1].exerciseId, position: 0 },
        { exerciseId: template.exercises[0].exerciseId, position: 1 },
      ]);
      expect(result.workout.exercises[0]).toMatchObject({
        sourceRecommendationId: recommendation.id,
        targetMaxReps: recommendation.targetMaxReps,
        targetMinReps: recommendation.targetMinReps,
        targetSets: recommendation.targetSets,
        targetWeightKg: recommendation.recommendedWeightKg,
      });
      expect(result.workout.exercises.map(({ id }) => id)).not.toEqual(template.exercises.map(({ id }) => id));
      expect(await database.getAllAsync<{ entity_type: string }>(
        "SELECT entity_type FROM sync_queue ORDER BY entity_type, entity_id;",
      )).toEqual([
        { entity_type: "progression_recommendation" },
        { entity_type: "workout" },
        { entity_type: "workout_exercise" },
        { entity_type: "workout_exercise" },
      ]);
      expect(mockEnsureProfile).not.toHaveBeenCalled();

      const workoutId = result.workout.id;
      database.close();
      database = new NodeSQLiteConnection(new DatabaseSync(filename));
      await configureLocalDatabase(database);
      await expect(new SQLiteLocalWorkoutRepository(database).getById(userId, workoutId))
        .resolves.toEqual(result.workout);
      await expect(database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM sync_queue WHERE attempt_count > 0 OR last_attempt_at IS NOT NULL;",
      )).resolves.toEqual({ count: 0 });
    } finally {
      database.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it.each<NetworkStatus>(["offline", "unknown", "online"])(
    "uses the same web-preview local-first entry path while connectivity is %s",
    async (networkStatus) => {
      const storage = new MemoryStorage();
      const profiles = new WebPreviewLocalProfileCacheRepository(storage);
      const templates = new WebPreviewLocalTemplateRepository(storage);
      const recommendations = new WebPreviewLocalRecommendationRepository(storage);
      const workouts = new WebPreviewLocalWorkoutRepository(storage);
      await profiles.upsert(profile);
      await templates.create(structuredClone(template));
      await recommendations.upsert(recommendation);

      mockCreateProfileCachePersistence.mockResolvedValue({ profileCacheRepository: profiles });
      mockCreateWorkoutPersistence.mockResolvedValue({
        exerciseHistoryRepository: new WebPreviewExerciseHistoryRepository(storage),
        recommendationRepository: recommendations,
        templateRepository: templates,
        workoutRepository: workouts,
      });

      const networkService: NetworkStatusService = {
        getCurrentStatus: async () => networkStatus,
        subscribe: () => () => undefined,
      };
      const onOpenWorkout = jest.fn();
      const screen = await render(
        <NetworkStatusProvider service={networkService}>
          <View>
            <NetworkStatusProbe />
            <HomeScreen
              discardActiveWorkout={jest.fn()}
              loadHome={loadCurrentUserWorkoutHome}
              onOpenWorkout={onOpenWorkout}
              startWorkout={requestCurrentUserWorkoutStart}
            />
          </View>
        </NetworkStatusProvider>,
      );

      expect(await screen.findByText(networkStatus)).toBeOnTheScreen();
      expect(await screen.findByText(template.name)).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole("button", { name: "Start Workout" }));
      await waitFor(() => expect(onOpenWorkout).toHaveBeenCalledTimes(1));
      const workoutId = onOpenWorkout.mock.calls[0][0] as string;
      const started = await new WebPreviewLocalWorkoutRepository(storage).getById(userId, workoutId);
      expect(started).toMatchObject({ userId, sourceTemplateId: template.id });
      expect(readWorkoutWebPreviewState(storage).queue.map(({ entityType }) => entityType).sort()).toEqual([
        "progression_recommendation",
        "workout",
        "workout_exercise",
        "workout_exercise",
      ]);
      expect(readWorkoutWebPreviewState(storage).queue.every(({ attemptCount }) => attemptCount === 0)).toBe(true);
      expect(mockEnsureProfile).not.toHaveBeenCalled();
    },
  );

  it("rejects missing, archived, and another owner's local templates without partial writes", async () => {
    const storage = new MemoryStorage();
    const profiles = new WebPreviewLocalProfileCacheRepository(storage);
    const templates = new WebPreviewLocalTemplateRepository(storage);
    const recommendations = new WebPreviewLocalRecommendationRepository(storage);
    const workouts = new WebPreviewLocalWorkoutRepository(storage);
    const archived = { ...structuredClone(template), id: "archived-template", isArchived: true };
    archived.exercises = archived.exercises.map((exercise) => ({
      ...exercise,
      id: `archived-${exercise.id}`,
      templateId: archived.id,
    }));
    const foreign = { ...structuredClone(template), id: "foreign-template", userId: "another-user" };
    foreign.exercises = foreign.exercises.map((exercise) => ({
      ...exercise,
      id: `foreign-${exercise.id}`,
      templateId: foreign.id,
      userId: foreign.userId,
    }));
    await profiles.upsert(profile);
    await templates.create(archived);
    await templates.create(foreign);
    mockCreateProfileCachePersistence.mockResolvedValue({ profileCacheRepository: profiles });
    mockCreateWorkoutPersistence.mockResolvedValue({
      exerciseHistoryRepository: new WebPreviewExerciseHistoryRepository(storage),
      recommendationRepository: recommendations,
      templateRepository: templates,
      workoutRepository: workouts,
    });

    await expect(requestCurrentUserWorkoutStart("missing-template"))
      .rejects.toThrow("This workout template is not available.");
    await expect(requestCurrentUserWorkoutStart(archived.id))
      .rejects.toThrow("This workout template is not available.");
    await expect(requestCurrentUserWorkoutStart(foreign.id))
      .rejects.toThrow("This workout template is not available.");
    expect(readWorkoutWebPreviewState(storage).workouts).toEqual([]);
    expect(readWorkoutWebPreviewState(storage).queue).toEqual([]);
  });
});
