import { resolveLocalOwner } from "@/features/routing/localOwnerIdentity";
import { readPersistedOwner, sessionStorageKey } from "@/lib/supabase/persistedOwner";
import { AuthServiceError } from "@/lib/supabase/services/AuthService";
import type { AuthSession, UserProfile } from "@/shared/contracts";

const userId = "00000000-0000-4000-8000-000000000001";
const otherId = "00000000-0000-4000-8000-000000000002";
const profile: UserProfile = { userId, weightUnit: "lb", primaryGoal: "hybrid",
  rpePreference: "optional", progressionStyle: "balanced", defaultRestDurationSeconds: 120,
  onboardingCompleted: true, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z" };

function fixture() {
  const values = new Map<string, string>();
  const key = sessionStorageKey("https://project.supabase.co");
  const storage = {
    getItem: (name: string) => values.get(name) ?? null,
    setItem: (name: string, value: string) => { values.set(name, value); },
    removeItem: (name: string) => { values.delete(name); },
  };
  const seed = (id = userId) => storage.setItem(key, JSON.stringify({ user: { id },
    access_token: "fixture-access", refresh_token: "fixture-refresh", expires_at: 1 }));
  seed();
  const getSession = jest.fn<Promise<AuthSession | null>, []>().mockRejectedValue(new AuthServiceError("getSession", "network_error"));
  const get = jest.fn<Promise<UserProfile | null>, [string]>().mockResolvedValue(profile);
  const dependencies = { authService: { getSession }, profileCache: { get }, readOwner: () => readPersistedOwner(storage, key) };
  return { dependencies, getSession, get, seed, storage, key };
}

describe("local ownership identity", () => {
  it("prefers a normal session and keeps the cloud/local contracts distinct", async () => {
    const f = fixture();
    f.getSession.mockResolvedValue({ user: { id: userId } });
    const owner = await resolveLocalOwner(f.dependencies);
    expect(owner).toMatchObject({ userId, source: "session" });
    expect(owner).not.toHaveProperty("user");
    expect(owner).not.toHaveProperty("access_token");
  });
  it("uses expired persisted ownership only after network failure with a matching cache", async () => {
    const f = fixture();
    const owner = await resolveLocalOwner(f.dependencies);
    expect(owner).toMatchObject({ userId, source: "offline-persisted-owner", cachedProfile: profile });
    await expect(f.getSession()).rejects.toMatchObject({ code: "network_error" });
    expect(f.get).toHaveBeenCalledWith(userId);
  });
  it.each(["missing", "invalid", "no-profile", "wrong-profile", "unrelated-error"])("rejects %s fallback", async (scenario) => {
    const f = fixture();
    if (scenario === "missing") f.storage.removeItem(f.key);
    if (scenario === "invalid") f.storage.setItem(f.key, JSON.stringify({ user: { id: userId } }));
    if (scenario === "no-profile") f.get.mockResolvedValue(null);
    if (scenario === "wrong-profile") f.get.mockResolvedValue({ ...profile, userId: otherId });
    if (scenario === "unrelated-error") f.getSession.mockRejectedValue(new AuthServiceError("getSession", "unknown"));
    await expect(resolveLocalOwner(f.dependencies)).rejects.toThrow();
  });
  it("does not interpret an actual missing session as offline", async () => {
    const f = fixture();
    f.getSession.mockResolvedValue(null);
    await expect(resolveLocalOwner(f.dependencies)).resolves.toBeNull();
    expect(f.get).not.toHaveBeenCalled();
  });
  it.each(["sign-out", "account-change"])("rejects a stale profile read after %s", async (change) => {
    const f = fixture();
    f.get.mockImplementation(async () => {
      if (change === "sign-out") f.storage.removeItem(f.key);
      else f.seed(otherId);
      return profile;
    });
    await expect(resolveLocalOwner(f.dependencies)).rejects.toThrow("ownership changed");
  });
  it("invalidates an already resolved local owner after sign-out", async () => {
    const f = fixture();
    const owner = await resolveLocalOwner(f.dependencies);
    f.storage.removeItem(f.key);
    expect(() => owner!.assertCurrent()).toThrow("ownership changed");
    await expect(resolveLocalOwner(f.dependencies)).rejects.toThrow();
  });
});
