import { updateCurrentProfileSettings } from "@/features/profile/services/profileApplication";
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
});
