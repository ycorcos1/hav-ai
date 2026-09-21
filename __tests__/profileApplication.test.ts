import {
  prepareSafeLogout,
  trySyncAndLogout,
  updateCurrentProfileSettings,
  type SafeLogoutDependencies,
} from "@/features/profile/services/profileApplication";
import type { ProfileRepository } from "@/lib/supabase/repositories";

jest.mock("@/lib/supabase/client", () => ({
  supabase: { auth: {}, from: jest.fn() },
}));

describe("profile application", () => {
  it("updates unit preference without touching canonical workout data", async () => {
    const updateOwnProfile = jest.fn().mockResolvedValue({ weightUnit: "kg" });
    const repository: ProfileRepository = {
      createOwnProfile: jest.fn(),
      getOwnProfile: jest.fn(),
      updateOwnProfile,
    };

    await updateCurrentProfileSettings({ weightUnit: "kg" }, repository);

    expect(updateOwnProfile).toHaveBeenCalledWith({ weightUnit: "kg" });
  });

  it("updates only the future RPE input preference", async () => {
    const updateOwnProfile = jest.fn().mockResolvedValue({ rpePreference: "hidden" });
    const repository: ProfileRepository = {
      createOwnProfile: jest.fn(),
      getOwnProfile: jest.fn(),
      updateOwnProfile,
    };

    await updateCurrentProfileSettings({ rpePreference: "hidden" }, repository);

    expect(updateOwnProfile).toHaveBeenCalledWith({ rpePreference: "hidden" });
  });

  it("updates only future primary-goal context", async () => {
    const updateOwnProfile = jest.fn().mockResolvedValue({ primaryGoal: "strength" });
    const repository: ProfileRepository = {
      createOwnProfile: jest.fn(),
      getOwnProfile: jest.fn(),
      updateOwnProfile,
    };

    await updateCurrentProfileSettings({ primaryGoal: "strength" }, repository);

    expect(updateOwnProfile).toHaveBeenCalledWith({ primaryGoal: "strength" });
  });

  it("recalculates active recommendations after progression style changes", async () => {
    const profile = {
      userId: "11111111-1111-4111-8111-111111111111",
      progressionStyle: "aggressive" as const,
    };
    const updateOwnProfile = jest.fn().mockResolvedValue(profile);
    const repository: ProfileRepository = {
      createOwnProfile: jest.fn(),
      getOwnProfile: jest.fn(),
      updateOwnProfile,
    };
    const recalculate = jest.fn().mockResolvedValue(undefined);

    await updateCurrentProfileSettings(
      { progressionStyle: "aggressive" },
      repository,
      recalculate,
    );

    expect(updateOwnProfile).toHaveBeenCalledWith({ progressionStyle: "aggressive" });
    expect(recalculate).toHaveBeenCalledWith(profile);
  });

  it("does not recalculate recommendations for unrelated profile changes", async () => {
    const updateOwnProfile = jest.fn().mockResolvedValue({ weightUnit: "kg" });
    const repository: ProfileRepository = {
      createOwnProfile: jest.fn(),
      getOwnProfile: jest.fn(),
      updateOwnProfile,
    };
    const recalculate = jest.fn();

    await updateCurrentProfileSettings({ weightUnit: "kg" }, repository, recalculate);

    expect(recalculate).not.toHaveBeenCalled();
  });

  it("maps the positive default rest duration through the profile repository", async () => {
    const updateOwnProfile = jest.fn().mockResolvedValue({ defaultRestDurationSeconds: 180 });
    const repository: ProfileRepository = {
      createOwnProfile: jest.fn(),
      getOwnProfile: jest.fn(),
      updateOwnProfile,
    };

    await updateCurrentProfileSettings(
      { defaultRestDurationSeconds: 180 },
      repository,
      jest.fn(),
    );

    expect(updateOwnProfile).toHaveBeenCalledWith({ defaultRestDurationSeconds: 180 });
  });

  it("logs out immediately when the current owner has no pending data", async () => {
    const dependencies = logoutDependencies({ pending: [0] });

    await expect(prepareSafeLogout(dependencies)).resolves.toBe("signed_out");

    expect(dependencies.signOut).toHaveBeenCalledTimes(1);
    expect(dependencies.synchronize).not.toHaveBeenCalled();
  });

  it("does not log out while owner-scoped queue data remains pending", async () => {
    const dependencies = logoutDependencies({ pending: [2] });

    await expect(prepareSafeLogout(dependencies)).resolves.toBe("pending_sync");

    expect(dependencies.signOut).not.toHaveBeenCalled();
  });

  it("logs out only after a successful sync drains the owner queue", async () => {
    const dependencies = logoutDependencies({ pending: [0], syncSuccess: true });

    await expect(trySyncAndLogout(dependencies)).resolves.toBe(true);

    expect(dependencies.synchronize).toHaveBeenCalledWith("user-a");
    expect(dependencies.signOut).toHaveBeenCalledTimes(1);
  });

  it("preserves the session when sync fails or leaves pending data", async () => {
    const dependencies = logoutDependencies({ pending: [1], syncSuccess: false });

    await expect(trySyncAndLogout(dependencies)).resolves.toBe(false);

    expect(dependencies.signOut).not.toHaveBeenCalled();
  });
});

function logoutDependencies({
  pending,
  syncSuccess = true,
}: {
  pending: number[];
  syncSuccess?: boolean;
}): SafeLogoutDependencies {
  return {
    countPending: jest.fn().mockImplementation(async () => pending.shift() ?? 0),
    getCurrentUserId: jest.fn().mockResolvedValue("user-a"),
    signOut: jest.fn().mockResolvedValue(undefined),
    synchronize: jest.fn().mockResolvedValue({
      remainingQueueSize: syncSuccess ? 0 : 1,
      success: syncSuccess,
    }),
  };
}
