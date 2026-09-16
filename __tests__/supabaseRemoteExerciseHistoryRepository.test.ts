const mockFrom = jest.fn();
const mockGetUser = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  RemoteExerciseHistoryRepositoryError,
  SupabaseRemoteExerciseHistoryRepository,
} from "@/lib/supabase/repositories";

const userId = "a0000000-0000-4000-8000-00000000000a";
const completedAt = "2026-09-16T12:00:00.000Z";
const serverUpdatedAt = "2026-09-16T12:05:00.000Z";

describe("SupabaseRemoteExerciseHistoryRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
  });

  it("fetches owned completed raw history and maps complete cache semantics", async () => {
    const workouts = query([{ ...workoutRow, user_id: userId }]);
    const exercises = query([{ ...workoutExerciseRow, user_id: userId }]);
    const sets = query([
      { ...setRow, id: "set-2", user_id: userId, position: 1, reps: 8 },
      { ...setRow, id: "set-1", user_id: userId, position: 0, reps: 9 },
    ]);
    mockFrom.mockImplementation((table: string) => ({
      workouts,
      workout_exercises: exercises,
      sets,
    })[table]);

    await expect(new SupabaseRemoteExerciseHistoryRepository()
      .fetchOwnCompletedSessions()).resolves.toEqual([{
        id: workoutExerciseRow.id,
        userId,
        exerciseId: workoutExerciseRow.exercise_id,
        workoutId: workoutRow.id,
        completedAt,
        targetSets: 3,
        targetMinReps: 8,
        targetMaxReps: 10,
        workingSets: [
          { weightKg: 80, reps: 9, rpe: 8 },
          { weightKg: 80, reps: 8, rpe: 8 },
        ],
        serverUpdatedAt,
      }]);
    expect(workouts.eq).toHaveBeenCalledWith("user_id", userId);
    expect(workouts.eq).toHaveBeenCalledWith("status", "completed");
    expect(exercises.eq).toHaveBeenCalledWith("user_id", userId);
    expect(sets.eq).toHaveBeenCalledWith("user_id", userId);
    expect(sets.eq).toHaveBeenCalledWith("set_type", "working");
  });

  it("rejects unauthenticated, foreign-owned, malformed, and provider data safely", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(new SupabaseRemoteExerciseHistoryRepository()
      .fetchOwnCompletedSessions()).rejects.toBeInstanceOf(
      RemoteExerciseHistoryRepositoryError,
    );
    expect(mockFrom).not.toHaveBeenCalled();

    configureQueries({ exerciseOwner: "foreign-user" });
    const foreignRequest = new SupabaseRemoteExerciseHistoryRepository()
      .fetchOwnCompletedSessions();
    await expect(foreignRequest).rejects.toMatchObject({
      code: "REMOTE_EXERCISE_HISTORY_REPOSITORY_ERROR",
    });
    await expect(foreignRequest).rejects.not.toThrow("foreign-user");

    configureQueries({ rpe: 4 });
    await expect(new SupabaseRemoteExerciseHistoryRepository()
      .fetchOwnCompletedSessions()).rejects.toBeInstanceOf(
      RemoteExerciseHistoryRepositoryError,
    );

    const rawProviderDetail = "raw provider detail";
    const failedWorkouts = query([], { message: rawProviderDetail });
    mockFrom.mockReturnValue(failedWorkouts);
    const providerRequest = new SupabaseRemoteExerciseHistoryRepository()
      .fetchOwnCompletedSessions();
    await expect(providerRequest).rejects.toBeInstanceOf(
      RemoteExerciseHistoryRepositoryError,
    );
    await expect(providerRequest).rejects.not.toThrow(rawProviderDetail);
  });
});

type Query = {
  select: jest.Mock;
  eq: jest.Mock;
  not: jest.Mock;
  in: jest.Mock;
  order: jest.Mock;
  range: jest.Mock;
};

function query(data: object[], error: object | null = null): Query {
  const builder: Query = {
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

function configureQueries({
  exerciseOwner = userId,
  rpe = 8,
}: {
  exerciseOwner?: string;
  rpe?: number;
}): void {
  const byTable: Record<string, Query> = {
    workouts: query([{ ...workoutRow, user_id: userId }]),
    workout_exercises: query([{ ...workoutExerciseRow, user_id: exerciseOwner }]),
    sets: query([{ ...setRow, user_id: userId, rpe }]),
  };
  mockFrom.mockImplementation((table: string) => byTable[table]);
}

const workoutRow = {
  id: "workout-1",
  user_id: userId,
  source_template_id: null,
  name: "Push",
  status: "completed",
  started_at: "2026-09-16T11:00:00.000Z",
  completed_at: completedAt,
  notes: null,
  created_at: "2026-09-16T11:00:00.000Z",
  updated_at: serverUpdatedAt,
};

const workoutExerciseRow = {
  id: "workout-exercise-1",
  user_id: userId,
  workout_id: workoutRow.id,
  exercise_id: "exercise-1",
  position: 0,
  target_sets: 3,
  target_min_reps: 8,
  target_max_reps: 10,
  target_weight_kg: 80,
  source_recommendation_id: null,
  notes: null,
  created_at: workoutRow.created_at,
  updated_at: serverUpdatedAt,
};

const setRow = {
  id: "set-1",
  user_id: userId,
  workout_id: workoutRow.id,
  workout_exercise_id: workoutExerciseRow.id,
  exercise_id: workoutExerciseRow.exercise_id,
  position: 0,
  set_type: "working",
  weight_kg: 80,
  reps: 9,
  rpe: 8,
  notes: null,
  completed_at: "2026-09-16T11:45:00.000Z",
  created_at: "2026-09-16T11:45:00.000Z",
  updated_at: serverUpdatedAt,
};
