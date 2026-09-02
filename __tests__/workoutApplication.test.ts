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
const mockPopulateExerciseFixture = jest.fn();

jest.mock("@/lib/supabase/services", () => ({
  authService: { getSession: (...args: unknown[]) => mockGetSession(...args) },
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

import {
  loadCurrentUserActiveWorkoutExercise,
  loadCurrentUserWorkoutOverview,
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
  };
  const workoutRepository: jest.Mocked<LocalWorkoutRepository> = {
    getById: jest.fn().mockResolvedValue(workout),
    getActiveForUser: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
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
  return {
    exerciseHistoryRepository,
    exerciseRepository,
    preferenceRepository,
    recommendationRepository,
    templateRepository,
    workoutRepository,
  };
}

describe("workout application overview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: "user-a" } });
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
});
