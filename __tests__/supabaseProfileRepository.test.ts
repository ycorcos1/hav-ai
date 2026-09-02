import type { UserProfile } from "@/shared/contracts";

const mockFrom = jest.fn();
const mockGetUser = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  ProfileRepositoryError,
  SupabaseProfileRepository,
  type ProfileRepository,
  type UpdateOwnProfileInput,
} from "@/lib/supabase/repositories";

const userId = "00000000-0000-4000-8000-000000000001";
const createdAt = "2026-08-30T12:00:00.000Z";
const updatedAt = "2026-08-30T13:00:00.000Z";

const profileRow = {
  user_id: userId,
  display_name: "Yahav",
  weight_unit: "lb",
  primary_goal: "strength",
  rpe_preference: "optional",
  progression_style: "balanced",
  default_rest_duration_seconds: 120,
  onboarding_completed: false,
  created_at: createdAt,
  updated_at: updatedAt,
};

const expectedProfile: UserProfile = {
  userId,
  displayName: "Yahav",
  weightUnit: "lb",
  primaryGoal: "strength",
  rpePreference: "optional",
  progressionStyle: "balanced",
  defaultRestDurationSeconds: 120,
  onboardingCompleted: false,
  createdAt,
  updatedAt,
};

describe("SupabaseProfileRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
  });

  it("gets and maps only the profile exposed by RLS", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: profileRow, error: null });
    const select = jest.fn(() => ({ maybeSingle }));
    mockFrom.mockReturnValue({ select });
    const repository = new SupabaseProfileRepository();

    await expect(repository.getOwnProfile()).resolves.toEqual(expectedProfile);
    expect(repository.getOwnProfile).toHaveLength(0);
    expect(mockFrom).toHaveBeenCalledWith("profiles");
    expect(select).toHaveBeenCalledWith("*");
  });

  it("returns null when the authenticated user has no profile", async () => {
    mockFrom.mockReturnValue({
      select: jest.fn(() => ({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
    });

    await expect(new SupabaseProfileRepository().getOwnProfile()).resolves.toBeNull();
  });

  it("creates an own profile with an intentional insert payload", async () => {
    const single = jest.fn().mockResolvedValue({ data: profileRow, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockFrom.mockReturnValue({ insert });

    await expect(
      new SupabaseProfileRepository().createOwnProfile({
        userId,
        displayName: "Yahav",
        weightUnit: "lb",
        primaryGoal: "strength",
        rpePreference: "optional",
        progressionStyle: "balanced",
        defaultRestDurationSeconds: 120,
        onboardingCompleted: false,
      }),
    ).resolves.toEqual(expectedProfile);

    expect(insert).toHaveBeenCalledWith({
      user_id: userId,
      display_name: "Yahav",
      weight_unit: "lb",
      primary_goal: "strength",
      rpe_preference: "optional",
      progression_style: "balanced",
      default_rest_duration_seconds: 120,
      onboarding_completed: false,
    });
  });

  it("lets the database resolve the canonical 120-second default when omitted", async () => {
    const single = jest.fn().mockResolvedValue({ data: profileRow, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockFrom.mockReturnValue({ insert });

    await expect(
      new SupabaseProfileRepository().createOwnProfile({
        userId,
        weightUnit: "lb",
        primaryGoal: "hybrid",
      }),
    ).resolves.toMatchObject({ defaultRestDurationSeconds: 120 });

    expect(insert).toHaveBeenCalledWith({
      user_id: userId,
      weight_unit: "lb",
      primary_goal: "hybrid",
    });
  });

  it("updates only whitelisted mutable fields for the authenticated user", async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        ...profileRow,
        display_name: null,
        weight_unit: "kg",
        default_rest_duration_seconds: 300,
      },
      error: null,
    });
    const select = jest.fn(() => ({ single }));
    const eq = jest.fn(() => ({ select }));
    const update = jest.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ update });
    const repository = new SupabaseProfileRepository();
    const input = {
      displayName: undefined,
      weightUnit: "kg",
      defaultRestDurationSeconds: 300,
      userId: "00000000-0000-4000-8000-000000000002",
      createdAt,
    } as unknown as UpdateOwnProfileInput;

    await expect(repository.updateOwnProfile(input)).resolves.toEqual({
      ...expectedProfile,
      displayName: undefined,
      weightUnit: "kg",
      defaultRestDurationSeconds: 300,
    });
    expect(repository.updateOwnProfile).toHaveLength(1);
    expect(update).toHaveBeenCalledWith({
      display_name: null,
      weight_unit: "kg",
      default_rest_duration_seconds: 300,
    });
    expect(eq).toHaveBeenCalledWith("user_id", userId);
  });

  it("rejects an update with a sanitized error when no user is authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const repository = new SupabaseProfileRepository();

    await expect(repository.updateOwnProfile({ weightUnit: "kg" })).rejects.toMatchObject({
      name: "ProfileRepositoryError",
      code: "PROFILE_REPOSITORY_ERROR",
      operation: "updateOwnProfile",
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("sanitizes authenticated-user and profile update provider failures", async () => {
    const repository = new SupabaseProfileRepository();
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "sensitive auth provider detail" },
    });

    const authRequest = repository.updateOwnProfile({ weightUnit: "kg" });
    await expect(authRequest).rejects.toMatchObject({
      name: "ProfileRepositoryError",
      operation: "updateOwnProfile",
    });
    await expect(authRequest).rejects.not.toThrow("sensitive auth provider detail");

    const single = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "sensitive PostgREST detail" },
    });
    const select = jest.fn(() => ({ single }));
    const eq = jest.fn(() => ({ select }));
    mockFrom.mockReturnValue({ update: jest.fn(() => ({ eq })) });

    const updateRequest = repository.updateOwnProfile({ weightUnit: "kg" });
    await expect(updateRequest).rejects.toMatchObject({
      name: "ProfileRepositoryError",
      operation: "updateOwnProfile",
    });
    await expect(updateRequest).rejects.not.toThrow("sensitive PostgREST detail");
    expect(eq).toHaveBeenCalledWith("user_id", userId);
  });

  it("converts provider and mapping failures to a repository error", async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn(() => ({
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "sensitive PostgREST detail" },
        }),
      })),
    });
    const repository = new SupabaseProfileRepository();
    const request = repository.getOwnProfile();

    await expect(request).rejects.toMatchObject({
      name: "ProfileRepositoryError",
      code: "PROFILE_REPOSITORY_ERROR",
      operation: "getOwnProfile",
    });
    await expect(request).rejects.not.toThrow("sensitive PostgREST detail");

    mockFrom.mockReturnValue({
      select: jest.fn(() => ({
        maybeSingle: jest.fn().mockResolvedValue({
          data: { ...profileRow, weight_unit: "unsupported" },
          error: null,
        }),
      })),
    });
    await expect(repository.getOwnProfile()).rejects.toBeInstanceOf(ProfileRepositoryError);
  });

  it("exposes canonical domain return types rather than generated rows", () => {
    type GetOwnProfileResult = Awaited<ReturnType<ProfileRepository["getOwnProfile"]>>;
    const result: GetOwnProfileResult = expectedProfile;

    expect(result).toEqual(expectedProfile);
  });
});
