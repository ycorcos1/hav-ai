import type {
  LocalExerciseRepository,
  LocalRecommendationRepository,
  LocalTemplateRepository,
  LocalWorkoutRepository,
} from "@/db/repositories/types";
import type { Exercise, Workout } from "@/shared/contracts";

const mockGetSession = jest.fn();
const mockCreateWorkoutPersistence = jest.fn();
const mockCreateExercisePersistence = jest.fn();
const mockCreateProfileCachePersistence = jest.fn();
const mockPopulateExerciseFixture = jest.fn();

jest.mock("@/lib/supabase/services", () => ({
  authService: { getSession: (...args: unknown[]) => mockGetSession(...args) },
}));
jest.mock("@/features/routing/localRecovery", () => ({
  requireCurrentLocalOwner: async () => {
    const session = await mockGetSession();
    if (!session) throw new Error("Workout sessions require an authenticated session.");
    return { userId: session.user.id, assertCurrent: () => {} };
  },
}));
jest.mock("@/features/workouts/services/workoutPersistence", () => ({
  createWorkoutPersistence: (...args: unknown[]) => mockCreateWorkoutPersistence(...args),
}));
jest.mock("@/features/exercises/services/exercisePersistence", () => ({
  createExercisePersistence: (...args: unknown[]) => mockCreateExercisePersistence(...args),
}));
jest.mock("@/features/exercises/services/populateExerciseFixture", () => ({
  populateExerciseFixture: (...args: unknown[]) => mockPopulateExerciseFixture(...args),
}));
jest.mock("@/features/profile/services/profileCachePersistence", () => ({
  createProfileCachePersistence: (...args: unknown[]) => mockCreateProfileCachePersistence(...args),
}));

import {
  loadCurrentUserCompletedWorkoutSummary,
  loadCurrentUserActiveWorkoutExercise,
  loadCurrentUserWorkoutHome,
  loadCurrentUserWorkoutOverview,
  updateCurrentUserActiveWorkoutNote,
} from "@/features/workouts/services/workoutApplication";

const time = "2026-09-02T12:00:00.000Z";
const workout: Workout = {
  id: "workout-1",
  userId: "user-a",
  name: "Snapshot Name",
  status: "active",
  startedAt: time,
  exercises: [
    { id: "child-2", userId: "user-a", workoutId: "workout-1", exerciseId: "exercise-2", position: 1, sets: [], createdAt: time, updatedAt: time },
    { id: "child-1", userId: "user-a", workoutId: "workout-1", exerciseId: "exercise-1", position: 0, sets: [], createdAt: time, updatedAt: time },
  ],
  createdAt: time,
  updatedAt: time,
};
const exercises: Exercise[] = [
  { id: "exercise-1", name: "Bench Press", primaryMuscleGroup: "chest", secondaryMuscleGroups: [], equipmentType: "barbell", measurementType: "weight_reps", isSystem: true, isArchived: false, createdAt: time, updatedAt: time },
  { id: "exercise-2", name: "Cable Fly", primaryMuscleGroup: "chest", secondaryMuscleGroups: [], equipmentType: "cable", measurementType: "weight_reps", isSystem: true, isArchived: false, createdAt: time, updatedAt: time },
];

function repositories() {
  const exerciseHistoryRepository = {
    getRecentSessions: jest.fn().mockResolvedValue([]),
    getBestSet: jest.fn(),
    getCompletedSetsForExercises: jest.fn().mockResolvedValue([]),
  };
  const workoutRepository: jest.Mocked<LocalWorkoutRepository> = {
    getById: jest.fn().mockResolvedValue(workout),
    getActiveForUser: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    finish: jest.fn(),
    delete: jest.fn(),
  };
  const templateRepository: jest.Mocked<LocalTemplateRepository> = {
    getById: jest.fn(),
    listForUser: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
  };
  const recommendationRepository: jest.Mocked<LocalRecommendationRepository> = {
    getById: jest.fn(),
    getActiveForExercise: jest.fn(),
    getForSourceWorkout: jest.fn().mockResolvedValue([]),
    upsert: jest.fn(),
    markConsumed: jest.fn(),
    supersede: jest.fn(),
  };
  const exerciseRepository: jest.Mocked<LocalExerciseRepository> = {
    getById: jest.fn(async (_userId, id) => exercises.find((exercise) => exercise.id === id) ?? null),
    listAccessible: jest.fn(),
    search: jest.fn(),
    upsert: jest.fn(),
    archiveCustomExercise: jest.fn(),
  };
  const preferenceRepository = {
    get: jest.fn().mockResolvedValue(null),
    listFavorites: jest.fn(),
    upsert: jest.fn(),
    deleteOrTombstone: jest.fn(),
  };
  const profileCacheRepository = {
    get: jest.fn().mockResolvedValue({ weightUnit: "kg" }),
    upsert: jest.fn(),
  };
  const workoutHistoryRepository = {
    getLatestCompletedForExercise: jest.fn(),
    listCompleted: jest.fn().mockResolvedValue({ items: [] }),
  };
  return {
    exerciseHistoryRepository,
    exerciseRepository,
    preferenceRepository,
    profileCacheRepository,
    recommendationRepository,
    templateRepository,
    workoutHistoryRepository,
    workoutRepository,
  };
}

describe("workout application overview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: "user-a" } });
    mockCreateProfileCachePersistence.mockResolvedValue({
      profileCacheRepository: {
        get: jest.fn().mockResolvedValue({
          userId: "user-a",
          weightUnit: "kg",
          primaryGoal: "hybrid",
          rpePreference: "optional",
          progressionStyle: "balanced",
          defaultRestDurationSeconds: 120,
          onboardingCompleted: true,
          createdAt: time,
          updatedAt: time,
        }),
        upsert: jest.fn(),
      },
    });
  });

  it("loads the three most recent completed workouts for Home from canonical history", async () => {
    const dependencies = repositories();
    const completed = { ...workout, status: "completed" as const, completedAt: time };
    dependencies.workoutRepository.getActiveForUser.mockResolvedValue(null);
    dependencies.templateRepository.listForUser.mockResolvedValue([]);
    dependencies.workoutHistoryRepository.listCompleted.mockResolvedValue({ items: [completed] });
    mockCreateWorkoutPersistence.mockResolvedValue(dependencies);

    await expect(loadCurrentUserWorkoutHome()).resolves.toEqual({
      activeWorkout: null,
      recentWorkouts: [completed],
      templates: [],
    });
    expect(dependencies.workoutHistoryRepository.listCompleted).toHaveBeenCalledWith({
      limit: 3,
      userId: "user-a",
    });
  });

  it("loads the owned workout snapshot and resolves exercises without reading its template", async () => {
    const dependencies = repositories();
    mockCreateWorkoutPersistence.mockResolvedValue(dependencies);
    mockCreateExercisePersistence.mockResolvedValue({
      exerciseRepository: dependencies.exerciseRepository,
      preferenceRepository: dependencies.preferenceRepository,
    });

    const overview = await loadCurrentUserWorkoutOverview(workout.id);

    expect(dependencies.workoutRepository.getById).toHaveBeenCalledWith("user-a", workout.id);
    expect(dependencies.templateRepository.getById).not.toHaveBeenCalled();
    expect(mockPopulateExerciseFixture).toHaveBeenCalledWith(dependencies.exerciseRepository);
    expect(overview?.workout).toBe(workout);
    expect(overview?.exercises.map(({ workoutExercise, exercise }) => [workoutExercise.id, exercise?.name])).toEqual([
      ["child-1", "Bench Press"],
      ["child-2", "Cable Fly"],
    ]);
  });

  it("returns missing state before resolving exercise data", async () => {
    const dependencies = repositories();
    dependencies.workoutRepository.getById.mockResolvedValue(null);
    mockCreateWorkoutPersistence.mockResolvedValue(dependencies);

    await expect(loadCurrentUserWorkoutOverview("missing")).resolves.toBeNull();
    expect(mockCreateExercisePersistence).not.toHaveBeenCalled();
    expect(mockPopulateExerciseFixture).not.toHaveBeenCalled();
  });

  it("loads an exercise from the active workout snapshot without reading its template", async () => {
    const dependencies = repositories();
    mockCreateWorkoutPersistence.mockResolvedValue(dependencies);
    mockCreateExercisePersistence.mockResolvedValue({
      exerciseRepository: dependencies.exerciseRepository,
      preferenceRepository: dependencies.preferenceRepository,
    });

    const activeExercise = await loadCurrentUserActiveWorkoutExercise(workout.id, "child-1");

    expect(activeExercise?.workoutExercise.id).toBe("child-1");
    expect(activeExercise?.exercise?.name).toBe("Bench Press");
    expect(activeExercise?.profile.weightUnit).toBe("kg");
    expect(dependencies.exerciseHistoryRepository.getRecentSessions).toHaveBeenCalledWith({
      userId: "user-a",
      exerciseId: "exercise-1",
      limit: 1,
    });
    expect(dependencies.preferenceRepository.get).toHaveBeenCalledWith("user-a", "exercise-1");
    expect(dependencies.templateRepository.getById).not.toHaveBeenCalled();
  });

  it("rejects completed workouts and mismatched workout-exercise IDs", async () => {
    const dependencies = repositories();
    dependencies.workoutRepository.getById.mockResolvedValue({ ...workout, status: "completed" });
    mockCreateWorkoutPersistence.mockResolvedValue(dependencies);

    await expect(loadCurrentUserActiveWorkoutExercise(workout.id, "child-1")).resolves.toBeNull();
    dependencies.workoutRepository.getById.mockResolvedValue(workout);
    await expect(loadCurrentUserActiveWorkoutExercise(workout.id, "other-child")).resolves.toBeNull();
    expect(mockCreateExercisePersistence).not.toHaveBeenCalled();
  });

  it("loads a completed summary through local history and exercise repositories", async () => {
    const dependencies = repositories();
    const completed = {
      ...workout,
      status: "completed" as const,
      completedAt: "2026-09-02T13:00:00.000Z",
      exercises: [{
        ...workout.exercises[1],
        sets: [{
          id: "set-a",
          userId: "user-a",
          workoutId: workout.id,
          workoutExerciseId: workout.exercises[1].id,
          exerciseId: workout.exercises[1].exerciseId,
          position: 0,
          setType: "working" as const,
          reps: 10,
          completedAt: "2026-09-02T12:30:00.000Z",
          createdAt: "2026-09-02T12:30:00.000Z",
          updatedAt: "2026-09-02T12:30:00.000Z",
        }],
      }],
    };
    dependencies.workoutRepository.getById.mockResolvedValue(completed);
    mockCreateWorkoutPersistence.mockResolvedValue(dependencies);
    mockCreateExercisePersistence.mockResolvedValue({
      exerciseRepository: dependencies.exerciseRepository,
      preferenceRepository: dependencies.preferenceRepository,
    });

    const summary = await loadCurrentUserCompletedWorkoutSummary(workout.id);

    expect(summary).toMatchObject({
      workout: { id: workout.id, status: "completed" },
      summary: { durationSeconds: 3600, exerciseCount: 1, workingSetCount: 1 },
      exercises: [{ exercise: { name: "Bench Press" }, summary: { totalReps: 10 } }],
    });
    expect(dependencies.exerciseHistoryRepository.getCompletedSetsForExercises)
      .toHaveBeenCalledWith({
        userId: "user-a",
        exerciseIds: ["exercise-1"],
        excludeWorkoutId: workout.id,
      });
  });

  it("updates only the authenticated user's active workout note", async () => {
    const dependencies = repositories();
    mockCreateWorkoutPersistence.mockResolvedValue(dependencies);
    dependencies.workoutRepository.getById.mockResolvedValue(workout);

    const updated = await updateCurrentUserActiveWorkoutNote({
      workoutId: workout.id,
      notes: " Session note ",
    });

    expect(dependencies.workoutRepository.getById).toHaveBeenCalledWith("user-a", workout.id);
    expect(dependencies.workoutRepository.update).toHaveBeenCalledWith(expect.objectContaining({
      id: workout.id,
      userId: "user-a",
      notes: "Session note",
    }));
    expect(updated.notes).toBe("Session note");
  });

  it("rejects missing and completed workouts without writing", async () => {
    const dependencies = repositories();
    mockCreateWorkoutPersistence.mockResolvedValue(dependencies);
    dependencies.workoutRepository.getById.mockResolvedValue(null);
    await expect(updateCurrentUserActiveWorkoutNote({ workoutId: "missing", notes: "No" }))
      .rejects.toThrow("active workout note could not be saved");

    dependencies.workoutRepository.getById.mockResolvedValue({ ...workout, status: "completed" });
    await expect(updateCurrentUserActiveWorkoutNote({ workoutId: workout.id, notes: "No" }))
      .rejects.toThrow("active workout note could not be saved");
    expect(dependencies.workoutRepository.update).not.toHaveBeenCalled();
  });
});
