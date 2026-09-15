const mockFrom = jest.fn();
const mockGetUser = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  RemoteWorkoutAdapterError,
  SupabaseRemoteWorkoutAdapter,
  type RemoteWorkoutAdapter,
} from "@/lib/supabase/repositories";
import type { Workout } from "@/shared/contracts";

const userId = "a0000000-0000-4000-8000-00000000000a";
const timestamp = "2026-09-15T14:00:00.000Z";
const workout: Workout = {
  id: "fa200000-0000-4000-8000-000000000001",
  userId,
  name: "Push Day",
  status: "active",
  startedAt: timestamp,
  notes: "Workout note",
  createdAt: timestamp,
  updatedAt: timestamp,
  exercises: [{
    id: "fa210000-0000-4000-8000-000000000001",
    userId,
    workoutId: "fa200000-0000-4000-8000-000000000001",
    exerciseId: "10000000-0000-4000-8000-000000000001",
    position: 0,
    notes: "Exercise note",
    sets: [{
      id: "fa220000-0000-4000-8000-000000000001",
      userId,
      workoutId: "fa200000-0000-4000-8000-000000000001",
      workoutExerciseId: "fa210000-0000-4000-8000-000000000001",
      exerciseId: "10000000-0000-4000-8000-000000000001",
      position: 0,
      setType: "working",
      weightKg: 80,
      reps: 10,
      notes: "Set note",
      completedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    }],
    createdAt: timestamp,
    updatedAt: timestamp,
  }],
};

function upsertTable(single: jest.Mock) {
  const upsert = jest.fn(() => ({
    select: jest.fn(() => ({ single })),
  }));
  mockFrom.mockReturnValue({ upsert });
  return upsert;
}

describe("SupabaseRemoteWorkoutAdapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
  });

  it("upserts a workout and returns server-confirmed metadata", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { updated_at: timestamp }, error: null,
    });
    const upsert = upsertTable(single);
    const adapter = new SupabaseRemoteWorkoutAdapter();

    await expect(adapter.upsertOwnWorkout(workout)).resolves.toEqual({
      serverUpdatedAt: timestamp,
    });
    expect(mockFrom).toHaveBeenCalledWith("workouts");
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      id: workout.id,
      user_id: userId,
    }), { onConflict: "id" });
  });

  it("upserts a workout exercise and returns server-confirmed metadata", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { updated_at: timestamp }, error: null,
    });
    const upsert = upsertTable(single);
    const adapter = new SupabaseRemoteWorkoutAdapter();

    await expect(adapter.upsertOwnWorkoutExercise(workout.exercises[0])).resolves.toEqual({
      serverUpdatedAt: timestamp,
    });
    expect(mockFrom).toHaveBeenCalledWith("workout_exercises");
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      id: workout.exercises[0].id,
      user_id: userId,
    }), { onConflict: "id" });
  });

  it("upserts a set and returns server-confirmed metadata", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { updated_at: timestamp }, error: null,
    });
    const upsert = upsertTable(single);
    const adapter = new SupabaseRemoteWorkoutAdapter();

    await expect(adapter.upsertOwnSet(workout.exercises[0].sets[0])).resolves.toEqual({
      serverUpdatedAt: timestamp,
    });
    expect(mockFrom).toHaveBeenCalledWith("sets");
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      id: workout.exercises[0].sets[0].id,
      user_id: userId,
    }), { onConflict: "id" });
  });

  it("deletes a set through explicit entity and authenticated-owner filters", async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: "set-id" }, error: null });
    const select = jest.fn(() => ({ single }));
    const ownerEq = jest.fn(() => ({ select }));
    const idEq = jest.fn(() => ({ eq: ownerEq }));
    const remove = jest.fn(() => ({ eq: idEq }));
    mockFrom.mockReturnValue({ delete: remove });

    await expect(new SupabaseRemoteWorkoutAdapter().deleteOwnSet("set-id")).resolves
      .toBeUndefined();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(idEq).toHaveBeenCalledWith("id", "set-id");
    expect(ownerEq).toHaveBeenCalledWith("user_id", userId);
  });

  it("rejects unauthenticated, foreign-owned, and provider failures with sanitized errors", async () => {
    const adapter = new SupabaseRemoteWorkoutAdapter();
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(adapter.upsertOwnWorkout(workout)).rejects.toBeInstanceOf(
      RemoteWorkoutAdapterError,
    );
    expect(mockFrom).not.toHaveBeenCalled();

    const foreignRequest = adapter.upsertOwnSet({
      ...workout.exercises[0].sets[0],
      userId: "foreign-user",
    });
    await expect(foreignRequest).rejects.toMatchObject({
      code: "REMOTE_WORKOUT_ADAPTER_ERROR",
      operation: "upsertOwnSet",
    });
    await expect(foreignRequest).rejects.not.toThrow("foreign-user");
    expect(mockFrom).not.toHaveBeenCalled();

    upsertTable(jest.fn().mockResolvedValue({
      data: null,
      error: { message: "raw database detail" },
    }));
    const providerRequest = adapter.upsertOwnWorkout(workout);
    await expect(providerRequest).rejects.toBeInstanceOf(RemoteWorkoutAdapterError);
    await expect(providerRequest).rejects.not.toThrow("raw database detail");
  });

  it("exposes only remote operations and does not mutate local or queue state", () => {
    const adapter: RemoteWorkoutAdapter = new SupabaseRemoteWorkoutAdapter();
    expect(adapter).not.toHaveProperty("markSynced");
    expect(adapter).not.toHaveProperty("removeQueueItem");
  });
});
