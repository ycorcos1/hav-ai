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
import type { Exercise } from "@/shared/contracts";

const userId = "a0000000-0000-4000-8000-00000000000a";
const systemId = "10000000-0000-4000-8000-000000000001";
const customId = "fa000000-0000-4000-8000-000000000001";
const timestamp = "2026-09-15T12:00:00.000Z";
const customExercise: Exercise = {
  id: customId,
  ownerUserId: userId,
  name: "My Press",
  primaryMuscleGroup: "chest",
  secondaryMuscleGroups: ["triceps"],
  equipmentType: "barbell",
  measurementType: "weight_reps",
  isSystem: false,
  isArchived: true,
  createdAt: timestamp,
  updatedAt: timestamp,
};

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
    const exerciseRange = jest.fn().mockResolvedValue({
      data: [exerciseRow(systemId, null), exerciseRow(customId, userId, true)],
      error: null,
    });
    const secondaryOrder = jest.fn().mockResolvedValue({
      data: [{ exercise_id: systemId, muscle_group: "triceps" }],
      error: null,
    });
    mockFrom.mockImplementation((table: string) => table === "exercises"
      ? { select: jest.fn(() => ({ order: jest.fn(() => ({ range: exerciseRange })) })) }
      : {
        select: jest.fn(() => ({
          in: jest.fn(() => ({ order: secondaryOrder })),
        })),
      });

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
    expect(exerciseRange).toHaveBeenCalledWith(0, 99);
  });

  it("paginates accessible exercise pulls deterministically", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => (
      exerciseRow(`10000000-0000-4000-8000-${String(index).padStart(12, "0")}`, null)
    ));
    const finalRow = exerciseRow(customId, userId);
    const range = jest.fn()
      .mockResolvedValueOnce({ data: firstPage, error: null })
      .mockResolvedValueOnce({ data: [finalRow], error: null });
    mockFrom.mockImplementation((table: string) => table === "exercises"
      ? { select: jest.fn(() => ({ order: jest.fn(() => ({ range })) })) }
      : {
        select: jest.fn(() => ({
          in: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      });

    await expect(new SupabaseExerciseRepository().fetchAccessible()).resolves.toHaveLength(101);
    expect(range.mock.calls).toEqual([[0, 99], [100, 199]]);
  });

  it("requires authentication and sanitizes provider and mapping failures", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(new SupabaseExerciseRepository().fetchAccessible()).rejects.toBeInstanceOf(
      ExerciseRepositoryError,
    );
    expect(mockFrom).not.toHaveBeenCalled();

    mockFrom.mockImplementation((table: string) => table === "exercises"
      ? {
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            range: jest.fn().mockResolvedValue({
              data: [exerciseRow(systemId, "wrong-owner")], error: null,
            }),
          })),
        })),
      }
      : {
        select: jest.fn(() => ({
          in: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      });
    const request = new SupabaseExerciseRepository().fetchAccessible();
    await expect(request).rejects.toMatchObject({
      code: "EXERCISE_REPOSITORY_ERROR",
      operation: "fetchAccessible",
    });
    await expect(request).rejects.not.toThrow("Cloud exercise ownership is invalid.");
  });

  it("rejects a foreign custom exercise before it can reach local hydration", async () => {
    mockFrom.mockImplementation((table: string) => table === "exercises"
      ? {
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            range: jest.fn().mockResolvedValue({
              data: [exerciseRow(customId, "foreign-user")], error: null,
            }),
          })),
        })),
      }
      : {
        select: jest.fn(() => ({
          in: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      });
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

  it("upserts an owned custom exercise with the same UUID and converges secondary muscles", async () => {
    const single = jest.fn().mockResolvedValue({ data: { updated_at: timestamp }, error: null });
    const exerciseUpsert = jest.fn(() => ({
      select: jest.fn(() => ({ single })),
    }));
    const currentSecondaryEq = jest.fn().mockResolvedValue({
      data: [{ muscle_group: "shoulders" }],
      error: null,
    });
    const staleIn = jest.fn().mockResolvedValue({ error: null });
    const deleteEq = jest.fn(() => ({ in: staleIn }));
    const secondaryUpsert = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => table === "exercises"
      ? { upsert: exerciseUpsert }
      : {
        select: jest.fn(() => ({ eq: currentSecondaryEq })),
        delete: jest.fn(() => ({ eq: deleteEq })),
        upsert: secondaryUpsert,
      });

    await expect(new SupabaseExerciseRepository().upsertOwnCustomExercise(customExercise))
      .resolves.toEqual({ serverUpdatedAt: timestamp });
    expect(exerciseUpsert).toHaveBeenCalledWith({
      id: customId,
      owner_user_id: userId,
      name: "My Press",
      primary_muscle_group: "chest",
      equipment_type: "barbell",
      measurement_type: "weight_reps",
      is_system: false,
      is_archived: true,
    }, { onConflict: "id" });
    expect(deleteEq).toHaveBeenCalledWith("exercise_id", customId);
    expect(staleIn).toHaveBeenCalledWith("muscle_group", ["shoulders"]);
    expect(secondaryUpsert).toHaveBeenCalledWith([
      { exercise_id: customId, muscle_group: "triceps" },
    ], { onConflict: "exercise_id,muscle_group" });
  });

  it("rejects system, foreign-owned, and provider-failed custom exercise writes safely", async () => {
    const repository = new SupabaseExerciseRepository();
    await expect(repository.upsertOwnCustomExercise({
      ...customExercise,
      isSystem: true,
      ownerUserId: undefined,
    })).rejects.toMatchObject({
      code: "EXERCISE_REPOSITORY_ERROR",
      operation: "upsertOwnCustomExercise",
    });
    await expect(repository.upsertOwnCustomExercise({
      ...customExercise,
      ownerUserId: "foreign-user",
    })).rejects.toBeInstanceOf(ExerciseRepositoryError);
    expect(mockFrom).not.toHaveBeenCalled();

    const upsert = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "provider detail" },
        }),
      })),
    }));
    mockFrom.mockReturnValue({ upsert });
    const request = repository.upsertOwnCustomExercise(customExercise);
    await expect(request).rejects.toMatchObject({
      code: "EXERCISE_REPOSITORY_ERROR",
      operation: "upsertOwnCustomExercise",
    });
    await expect(request).rejects.not.toThrow("provider detail");
  });

  it("returns the canonical repository contract", () => {
    const repository: ExerciseRepository = new SupabaseExerciseRepository();
    expect(repository.fetchAccessible).toHaveLength(0);
    expect(repository.upsertOwnCustomExercise).toHaveLength(1);
  });
});
