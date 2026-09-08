import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  configureLocalDatabase,
  SQLiteLocalProfileCacheRepository,
} from "@/db";
import { WebPreviewLocalProfileCacheRepository } from "@/db/webPreview/WebPreviewLocalProfileCacheRepository";
import type { WebPreviewStorage } from "@/db/webPreview/storage";
import { CachedProfileRepository } from "@/features/profile/services/CachedProfileRepository";
import { getCachedWorkoutProfile } from "@/features/workouts/services/workoutProfilePreferences";
import type { LocalProfileCacheRepository } from "@/db/repositories/types";
import type { ProfileRepository } from "@/lib/supabase/repositories";
import type { UserProfile } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const userId = "00000000-0000-4000-8000-000000000001";
const otherUserId = "00000000-0000-4000-8000-000000000002";
const profile: UserProfile = {
  userId,
  displayName: "Yahav",
  weightUnit: "lb",
  primaryGoal: "hybrid",
  rpePreference: "optional",
  progressionStyle: "balanced",
  defaultRestDurationSeconds: 120,
  onboardingCompleted: true,
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-01T12:00:00.000Z",
};

class MemoryStorage implements WebPreviewStorage {
  private readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function createRemoteRepository(): jest.Mocked<ProfileRepository> {
  return {
    getOwnProfile: jest.fn(),
    createOwnProfile: jest.fn(),
    updateOwnProfile: jest.fn(),
  };
}

describe("local profile cache", () => {
  it("stores the canonical profile, isolates users, and replaces updated preferences", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    await configureLocalDatabase(database);
    const repository = new SQLiteLocalProfileCacheRepository(database);

    await repository.upsert(profile);
    expect(await repository.get(userId)).toEqual(profile);
    expect(await repository.get(otherUserId)).toBeNull();

    const updated = { ...profile, weightUnit: "kg" as const, rpePreference: "preferred" as const };
    await repository.upsert(updated);
    expect(await repository.get(userId)).toEqual(updated);
    database.close();
  });

  it("survives a real SQLite close and reopen", async () => {
    const directory = mkdtempSync(join(tmpdir(), "havai-profile-cache-"));
    const filename = join(directory, "profile.db");

    try {
      const first = new NodeSQLiteConnection(new DatabaseSync(filename));
      await configureLocalDatabase(first);
      await new SQLiteLocalProfileCacheRepository(first).upsert(profile);
      first.close();

      const reopened = new NodeSQLiteConnection(new DatabaseSync(filename));
      await configureLocalDatabase(reopened);
      await expect(new SQLiteLocalProfileCacheRepository(reopened).get(userId)).resolves.toEqual(profile);
      reopened.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("survives web-preview repository recreation without exposing another user", async () => {
    const storage = new MemoryStorage();
    await new WebPreviewLocalProfileCacheRepository(storage).upsert(profile);

    const recreated = new WebPreviewLocalProfileCacheRepository(storage);
    expect(await recreated.get(userId)).toEqual(profile);
    expect(await recreated.get(otherUserId)).toBeNull();
  });

  it("caches every successfully resolved or changed cloud profile", async () => {
    const remote = createRemoteRepository();
    const cache: jest.Mocked<LocalProfileCacheRepository> = {
      get: jest.fn(),
      upsert: jest.fn(),
    };
    const repository = new CachedProfileRepository(remote, async () => cache);
    remote.getOwnProfile.mockResolvedValue(profile);
    remote.createOwnProfile.mockResolvedValue(profile);
    const updated = { ...profile, weightUnit: "kg" as const };
    remote.updateOwnProfile.mockResolvedValue(updated);

    await expect(repository.getOwnProfile()).resolves.toEqual(profile);
    await expect(repository.createOwnProfile({
      userId,
      weightUnit: "lb",
      primaryGoal: "hybrid",
    })).resolves.toEqual(profile);
    await expect(repository.updateOwnProfile({ weightUnit: "kg" })).resolves.toEqual(updated);

    expect(cache.upsert).toHaveBeenNthCalledWith(1, profile);
    expect(cache.upsert).toHaveBeenNthCalledWith(2, profile);
    expect(cache.upsert).toHaveBeenNthCalledWith(3, updated);
  });

  it("does not report cloud profile success when the local cache write fails", async () => {
    const remote = createRemoteRepository();
    const cache: jest.Mocked<LocalProfileCacheRepository> = {
      get: jest.fn(),
      upsert: jest.fn().mockRejectedValue(new Error("local cache unavailable")),
    };
    const repository = new CachedProfileRepository(remote, async () => cache);
    remote.updateOwnProfile.mockResolvedValue(profile);

    await expect(repository.updateOwnProfile({ weightUnit: "lb" })).rejects.toThrow(
      "local cache unavailable",
    );
  });

  it("resolves active-workout preferences from the local cache without a cloud repository", async () => {
    const storage = new MemoryStorage();
    const cache = new WebPreviewLocalProfileCacheRepository(storage);
    await cache.upsert({ ...profile, weightUnit: "kg" });

    await expect(getCachedWorkoutProfile(cache, userId)).resolves.toMatchObject({
      userId,
      weightUnit: "kg",
    });
    await expect(getCachedWorkoutProfile(cache, otherUserId)).rejects.toMatchObject({
      name: "WorkoutProfilePreferenceError",
    });
  });
});
