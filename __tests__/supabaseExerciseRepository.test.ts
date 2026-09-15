const mockFrom = jest.fn();
const mockGetUser = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  ExerciseRepositoryError,
  SupabaseExerciseRepository,
  type ExerciseRepository,
} from "@/lib/supabase/repositories";

const userId = "a0000000-0000-4000-8000-00000000000a";
const systemId = "10000000-0000-4000-8000-000000000001";
const customId = "fa000000-0000-4000-8000-000000000001";
const timestamp = "2026-09-15T12:00:00.000Z";

function exerciseRow(id: string, ownerUserId: string | null, archived = false) {
  return {
    id,
    owner_user_id: ownerUserId,
    name: ownerUserId ? "My Press" : "Barbell Bench Press",
    primary_muscle_group: "chest",
    equipment_type: "barbell",
    measurement_type: "weight_reps",
    is_system: ownerUserId === null,
    is_archived: archived,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

describe("SupabaseExerciseRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
  });

  it("fetches and maps the system and own custom exercises exposed by RLS", async () => {
    const exerciseOrder = jest.fn().mockResolvedValue({
      data: [exerciseRow(systemId, null), exerciseRow(customId, userId, true)],
      error: null,
    });
    const secondaryOrder = jest.fn().mockResolvedValue({
      data: [{ exercise_id: systemId, muscle_group: "triceps" }],
      error: null,
    });
    mockFrom.mockImplementation((table: string) => ({
      select: jest.fn(() => ({
        order: table === "exercises" ? exerciseOrder : secondaryOrder,
      })),
    }));

    const repository = new SupabaseExerciseRepository();
    await expect(repository.fetchAccessible()).resolves.toEqual([
      expect.objectContaining({
        exercise: expect.objectContaining({ id: systemId, secondaryMuscleGroups: ["triceps"] }),
        serverUpdatedAt: timestamp,
      }),
      expect.objectContaining({
        exercise: expect.objectContaining({
          id: customId,
          ownerUserId: userId,
          isArchived: true,
        }),
      }),
    ]);
    expect(mockFrom).toHaveBeenCalledWith("exercises");
    expect(mockFrom).toHaveBeenCalledWith("exercise_secondary_muscles");
  });

  it("requires authentication and sanitizes provider and mapping failures", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(new SupabaseExerciseRepository().fetchAccessible()).rejects.toBeInstanceOf(
      ExerciseRepositoryError,
    );
    expect(mockFrom).not.toHaveBeenCalled();

    mockFrom.mockImplementation((table: string) => ({
      select: jest.fn(() => ({
        order: jest.fn().mockResolvedValue(table === "exercises"
          ? { data: [exerciseRow(systemId, "wrong-owner")], error: null }
          : { data: [], error: null }),
      })),
    }));
    const request = new SupabaseExerciseRepository().fetchAccessible();
    await expect(request).rejects.toMatchObject({
      code: "EXERCISE_REPOSITORY_ERROR",
      operation: "fetchAccessible",
    });
    await expect(request).rejects.not.toThrow("Cloud exercise ownership is invalid.");
  });

  it("rejects a foreign custom exercise before it can reach local hydration", async () => {
    mockFrom.mockImplementation((table: string) => ({
      select: jest.fn(() => ({
        order: jest.fn().mockResolvedValue(table === "exercises"
          ? { data: [exerciseRow(customId, "foreign-user")], error: null }
          : { data: [], error: null }),
      })),
    }));
    const hydrateFromCloud = jest.fn();

    const hydrateFetchedExercises = async () => {
      const snapshots = await new SupabaseExerciseRepository().fetchAccessible();
      await Promise.all(snapshots.map((item) => hydrateFromCloud(userId, item)));
    };

    const request = hydrateFetchedExercises();
    await expect(request).rejects.toMatchObject({
      code: "EXERCISE_REPOSITORY_ERROR",
      operation: "fetchAccessible",
    });
    await expect(request).rejects.not.toThrow("foreign-user");
    expect(hydrateFromCloud).not.toHaveBeenCalled();
  });

  it("returns the canonical repository contract", () => {
    const repository: ExerciseRepository = new SupabaseExerciseRepository();
    expect(repository.fetchAccessible).toHaveLength(0);
  });
});
