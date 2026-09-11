import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { configureLocalDatabase } from "@/db/bootstrap";
import { SQLiteLocalWorkoutRepository } from "@/db/repositories/SQLiteLocalWorkoutRepository";
import { SQLiteLocalProfileCacheRepository } from "@/db/repositories/SQLiteLocalProfileCacheRepository";
import { SQLiteSetPersistence } from "@/features/workouts/services/setPersistence.native";
import { CompleteSetService } from "@/features/workouts/services/completeSet";
import { AuthServiceError, type AuthService } from "@/lib/supabase/services/AuthService";
import type { ProfileRepository } from "@/lib/supabase/repositories/ProfileRepository";
import type { Workout, UserProfile } from "@/shared/contracts";
import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const mockGetSession = jest.fn();
const mockReadStorage = jest.fn();
const mockWorkoutPersistence = jest.fn();
const mockProfilePersistence = jest.fn();
jest.mock("@/lib/supabase/services", () => ({ authService: { getSession: () => mockGetSession() } }));
jest.mock("@/lib/environment", () => ({ environment: { supabaseUrl: "https://project.supabase.co" } }));
jest.mock("@/lib/supabase/authStorage", () => ({ authStorage: { getItem: () => mockReadStorage() } }));
jest.mock("@/features/workouts/services/workoutPersistence", () => ({ createWorkoutPersistence: () => mockWorkoutPersistence() }));
jest.mock("@/features/profile/services/profileCachePersistence", () => ({ createProfileCachePersistence: () => mockProfilePersistence() }));

import { recoverLocalStartup } from "@/features/routing/localRecovery";
import { loadCurrentUserWorkoutHome } from "@/features/workouts/services/workoutApplication";

it("recovers the same workout and committed set after file reopen without cloud or queue changes", async () => {
  const directory = mkdtempSync(join(tmpdir(), "havai-recovery-"));
  const filename = join(directory, "recovery.db");
  let database = new NodeSQLiteConnection(new DatabaseSync(filename));
  const userId = "00000000-0000-4000-8000-000000000001";
  const time = "2026-09-01T00:00:00.000Z";
  const workout: Workout = { id: "00000000-0000-4000-8000-000000000002", userId,
    name: "Recovery", status: "active", startedAt: time, createdAt: time, updatedAt: time,
    exercises: [{ id: "00000000-0000-4000-8000-000000000003", userId,
      workoutId: "00000000-0000-4000-8000-000000000002",
      exerciseId: "00000000-0000-4000-8000-000000000004", position: 0,
      targetSets: 3, targetMinReps: 6, targetMaxReps: 8, sets: [], createdAt: time, updatedAt: time }] };
  const profile: UserProfile = { userId, weightUnit: "lb", primaryGoal: "hybrid",
    rpePreference: "optional", progressionStyle: "balanced", defaultRestDurationSeconds: 120,
    onboardingCompleted: true, createdAt: time, updatedAt: time };
  const remote: jest.Mocked<ProfileRepository> = { getOwnProfile: jest.fn(), createOwnProfile: jest.fn(), updateOwnProfile: jest.fn() };
  const auth: AuthService = { getSession: mockGetSession, signIn: jest.fn(), signUp: jest.fn(), signOut: jest.fn(), subscribeToSession: jest.fn() };
  try {
    await configureLocalDatabase(database);
    await new SQLiteLocalProfileCacheRepository(database).upsert(profile);
    await new SQLiteLocalWorkoutRepository(database).create(workout);
    const completed = await new CompleteSetService(new SQLiteSetPersistence(database)).complete(userId, {
      workoutId: workout.id, workoutExerciseId: workout.exercises[0].id,
      exerciseId: workout.exercises[0].exerciseId, setType: "working", reps: 8, weightKg: 50,
    });
    const queue = await database.getAllAsync("SELECT * FROM sync_queue ORDER BY id;");
    database.close();
    database = new NodeSQLiteConnection(new DatabaseSync(filename));
    await configureLocalDatabase(database);
    const repository = new SQLiteLocalWorkoutRepository(database);
    mockGetSession.mockRejectedValue(new AuthServiceError("getSession", "network_error"));
    mockReadStorage.mockReturnValue(JSON.stringify({ user: { id: userId }, access_token: "fixture", refresh_token: "fixture", expires_at: 1 }));
    mockProfilePersistence.mockResolvedValue({ profileCacheRepository: new SQLiteLocalProfileCacheRepository(database) });
    mockWorkoutPersistence.mockResolvedValue({ workoutRepository: repository, templateRepository: { listForUser: async () => [] } });
    await expect(recoverLocalStartup({ authService: auth, profileRepository: remote })).resolves.toEqual({ status: "local-owner", onboardingComplete: true });
    const home = await loadCurrentUserWorkoutHome();
    expect(home.activeWorkout).toEqual({ ...workout, exercises: [{ ...workout.exercises[0], sets: [completed.set] }] });
    expect(await repository.getActiveForUser("another-user")).toBeNull();
    expect(await database.getAllAsync("SELECT * FROM sync_queue ORDER BY id;")).toEqual(queue);
    expect(await database.getFirstAsync("SELECT count(*) AS count FROM local_workouts;")).toEqual({ count: 1 });
    expect(remote.getOwnProfile).not.toHaveBeenCalled();
    expect(remote.createOwnProfile).not.toHaveBeenCalled();
  } finally {
    database.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
