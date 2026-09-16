const mockFrom = jest.fn();
const mockGetUser = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  PersonalRecordRepositoryError,
  SupabasePersonalRecordRepository,
  type PersonalRecordCandidate,
} from "@/lib/supabase/repositories";

const userId = "a0000000-0000-4000-8000-00000000000a";
const timestamp = "2026-09-16T12:00:00.000Z";

describe("SupabasePersonalRecordRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
  });

  it("fetches only authenticated completed working-set history", async () => {
    const workouts = pagedQuery([{ id: "workout-a", user_id: userId }]);
    const sets = pagedQuery([{ ...setRow, user_id: userId }]);
    mockFrom.mockImplementation((table: string) => ({ workouts, sets })[table]);

    await expect(new SupabasePersonalRecordRepository()
      .fetchOwnCompletedWorkingSets()).resolves.toEqual([expect.objectContaining({
      id: setRow.id,
      userId,
      setType: "working",
      weightKg: 100,
    })]);
    expect(workouts.eq).toHaveBeenCalledWith("user_id", userId);
    expect(workouts.eq).toHaveBeenCalledWith("status", "completed");
    expect(sets.eq).toHaveBeenCalledWith("user_id", userId);
    expect(sets.eq).toHaveBeenCalledWith("set_type", "working");
  });

  it("upserts current records with stable IDs and removes stale derived state", async () => {
    const currentRows = [
      personalRecordRow("record-existing", "exercise-a", "max_weight"),
      personalRecordRow("record-stale", "exercise-stale", "max_weight"),
    ];
    const currentSelect = jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ data: currentRows, error: null }),
    }));
    const upsertSelect = jest.fn().mockResolvedValue({
      data: [
        personalRecordRow("record-existing", "exercise-a", "max_weight"),
        personalRecordRow("record-new", "exercise-a", "estimated_1rm"),
      ],
      error: null,
    });
    const upsert = jest.fn(() => ({ select: upsertSelect }));
    const deleteSelect = jest.fn().mockResolvedValue({
      data: [{ id: "record-stale" }], error: null,
    });
    const deleteIn = jest.fn(() => ({ select: deleteSelect }));
    const deleteEq = jest.fn(() => ({ in: deleteIn }));
    const remove = jest.fn(() => ({ eq: deleteEq }));
    mockFrom.mockReturnValue({ select: currentSelect, upsert, delete: remove });
    const createId = jest.fn().mockReturnValue("record-new");
    const candidates: PersonalRecordCandidate[] = [
      candidate("max_weight"),
      candidate("estimated_1rm"),
    ];

    await expect(new SupabasePersonalRecordRepository(undefined, createId)
      .replaceOwnCurrentRecords(candidates)).resolves.toEqual([
      expect.objectContaining({ id: "record-new", recordType: "estimated_1rm" }),
      expect.objectContaining({ id: "record-existing", recordType: "max_weight" }),
    ]);
    expect(upsert).toHaveBeenCalledWith([
      expect.objectContaining({ id: "record-existing", user_id: userId }),
      expect.objectContaining({ id: "record-new", user_id: userId }),
    ], { onConflict: "user_id,exercise_id,record_type" });
    expect(deleteEq).toHaveBeenCalledWith("user_id", userId);
    expect(deleteIn).toHaveBeenCalledWith("id", ["record-stale"]);
  });

  it("derives ownership from auth and never accepts a caller-selected user", async () => {
    const currentSelect = jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    }));
    const upsert = jest.fn(() => ({
      select: jest.fn().mockResolvedValue({
        data: [personalRecordRow("record-new", "exercise-a", "max_weight")],
        error: null,
      }),
    }));
    mockFrom.mockReturnValue({ select: currentSelect, upsert });
    const extraCallerData = { ...candidate("max_weight"), userId: "foreign-user" };

    await new SupabasePersonalRecordRepository(undefined, () => "record-new")
      .replaceOwnCurrentRecords([extraCallerData]);
    expect(upsert).toHaveBeenCalledWith([
      expect.objectContaining({ user_id: userId }),
    ], expect.anything());
  });

  it("sanitizes unauthenticated, foreign-owned, malformed, and provider failures", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(new SupabasePersonalRecordRepository()
      .fetchOwnCompletedWorkingSets()).rejects.toBeInstanceOf(PersonalRecordRepositoryError);
    expect(mockFrom).not.toHaveBeenCalled();

    const foreignWorkouts = pagedQuery([{ id: "workout-a", user_id: "foreign-user" }]);
    mockFrom.mockReturnValue(foreignWorkouts);
    const foreignRequest = new SupabasePersonalRecordRepository()
      .fetchOwnCompletedWorkingSets();
    await expect(foreignRequest).rejects.toMatchObject({
      code: "PERSONAL_RECORD_REPOSITORY_ERROR",
    });
    await expect(foreignRequest).rejects.not.toThrow("foreign-user");

    const rawProviderDetail = "raw provider detail";
    mockFrom.mockReturnValue(pagedQuery([], { message: rawProviderDetail }));
    const providerRequest = new SupabasePersonalRecordRepository()
      .fetchOwnCompletedWorkingSets();
    await expect(providerRequest).rejects.toBeInstanceOf(PersonalRecordRepositoryError);
    await expect(providerRequest).rejects.not.toThrow(rawProviderDetail);
  });
});

type PagedQuery = {
  select: jest.Mock;
  eq: jest.Mock;
  not: jest.Mock;
  in: jest.Mock;
  order: jest.Mock;
  range: jest.Mock;
};

function pagedQuery(data: object[], error: object | null = null): PagedQuery {
  const builder: PagedQuery = {
    select: jest.fn(),
    eq: jest.fn(),
    not: jest.fn(),
    in: jest.fn(),
    order: jest.fn(),
    range: jest.fn(),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.not.mockReturnValue(builder);
  builder.in.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.range.mockResolvedValue({ data, error });
  return builder;
}

function candidate(recordType: "max_weight" | "estimated_1rm"): PersonalRecordCandidate {
  return {
    exerciseId: "exercise-a",
    recordType,
    setId: "set-a",
    workoutId: "workout-a",
    weightKg: 100,
    reps: 5,
    ...(recordType === "estimated_1rm" ? { estimated1RMKg: 116.6667 } : {}),
    achievedAt: timestamp,
  };
}

function personalRecordRow(
  id: string,
  exerciseId: string,
  recordType: "max_weight" | "estimated_1rm",
) {
  return {
    id,
    user_id: userId,
    exercise_id: exerciseId,
    record_type: recordType,
    set_id: "set-a",
    workout_id: "workout-a",
    weight_kg: 100,
    reps: 5,
    estimated_1rm_kg: recordType === "estimated_1rm" ? 116.6667 : null,
    achieved_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

const setRow = {
  id: "set-a",
  user_id: userId,
  workout_id: "workout-a",
  workout_exercise_id: "workout-exercise-a",
  exercise_id: "exercise-a",
  position: 0,
  set_type: "working",
  weight_kg: 100,
  reps: 5,
  rpe: null,
  notes: null,
  completed_at: timestamp,
  created_at: timestamp,
  updated_at: timestamp,
};
