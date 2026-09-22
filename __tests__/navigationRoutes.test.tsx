import { render } from "@testing-library/react-native";

type HomeRouteProps = { onOpenWorkout: (id: string) => void };
type WorkoutsRouteProps = {
  onCreate: () => void;
  onOpen: (id: string) => void;
  onOpenHistory: () => void;
};
type ProgressRouteProps = { onOpenExercise: (id: string) => void };
type WorkoutOverviewRouteProps = {
  onOpenExercise: (id: string) => void;
  onWorkoutFinished: () => void;
};
type ExerciseLoggingRouteProps = {
  onAskCoach: () => void;
  onOpenExercise: (id: string) => void;
  onOverview: () => void;
};
type WorkoutSummaryRouteProps = { onDone: () => void };
type WorkoutHistoryRouteProps = { onOpenWorkout: (id: string) => void };
type WorkoutHistoryDetailRouteProps = { onDeleted: () => void };
type ExerciseProgressRouteProps = { loadProgress: () => Promise<unknown> };

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockTabScreens: { name: string; title?: string }[] = [];
let mockInitialTabRoute: string | undefined;
let mockParams: Record<string, string> = {};
let mockHomeProps: HomeRouteProps | undefined;
let mockWorkoutsProps: WorkoutsRouteProps | undefined;
let mockProgressProps: ProgressRouteProps | undefined;
let mockWorkoutOverviewProps: WorkoutOverviewRouteProps | undefined;
let mockExerciseLoggingProps: ExerciseLoggingRouteProps | undefined;
let mockWorkoutSummaryProps: WorkoutSummaryRouteProps | undefined;
let mockWorkoutHistoryProps: WorkoutHistoryRouteProps | undefined;
let mockWorkoutHistoryDetailProps: WorkoutHistoryDetailRouteProps | undefined;
let mockExerciseProgressProps: ExerciseProgressRouteProps | undefined;

jest.mock("expo-router", () => {
  const React = require("react");
  const { View } = require("react-native");
  function Tabs({ children, initialRouteName }: { children?: unknown; initialRouteName?: string }) {
    mockInitialTabRoute = initialRouteName;
    return React.createElement(View, null, children);
  }
  Tabs.Screen = ({ name, options }: { name: string; options?: { title?: string } }) => {
    mockTabScreens.push({ name, title: options?.title });
    return null;
  };
  return {
    Tabs,
    useLocalSearchParams: () => mockParams,
    useRouter: () => ({ push: mockPush, replace: mockReplace }),
  };
});

jest.mock("@/features/home/screens/HomeScreen", () => ({
  HomeScreen: (props: HomeRouteProps) => { mockHomeProps = props; return null; },
}));
jest.mock("@/features/workouts/screens/WorkoutsScreen", () => ({
  WorkoutsScreen: (props: WorkoutsRouteProps) => { mockWorkoutsProps = props; return null; },
}));
jest.mock("@/features/progress/screens/ProgressScreen", () => ({
  ProgressScreen: (props: ProgressRouteProps) => { mockProgressProps = props; return null; },
}));
jest.mock("@/features/coach/screens/CoachScreen", () => ({
  CoachScreen: () => null,
}));
jest.mock("@/features/workouts/screens/ActiveWorkoutOverviewScreen", () => ({
  ActiveWorkoutOverviewScreen: (props: WorkoutOverviewRouteProps) => {
    mockWorkoutOverviewProps = props;
    return null;
  },
}));
jest.mock("@/features/workouts/screens/ActiveExerciseLoggingScreen", () => ({
  ActiveExerciseLoggingScreen: (props: ExerciseLoggingRouteProps) => {
    mockExerciseLoggingProps = props;
    return null;
  },
}));
jest.mock("@/features/workouts/screens/WorkoutSummaryScreen", () => ({
  WorkoutSummaryScreen: (props: WorkoutSummaryRouteProps) => {
    mockWorkoutSummaryProps = props;
    return null;
  },
}));
jest.mock("@/features/workouts/screens/WorkoutHistoryScreen", () => ({
  WorkoutHistoryScreen: (props: WorkoutHistoryRouteProps) => {
    mockWorkoutHistoryProps = props;
    return null;
  },
}));
jest.mock("@/features/workouts/screens/WorkoutHistoryDetailScreen", () => ({
  WorkoutHistoryDetailScreen: (props: WorkoutHistoryDetailRouteProps) => {
    mockWorkoutHistoryDetailProps = props;
    return null;
  },
}));
jest.mock("@/features/progress/screens/ExerciseProgressScreen", () => ({
  ExerciseProgressScreen: (props: ExerciseProgressRouteProps) => {
    mockExerciseProgressProps = props;
    return null;
  },
}));

const mockLoadExerciseProgress = jest.fn().mockResolvedValue(null);
jest.mock("@/features/progress/services/progressApplication", () => ({
  loadCurrentUserProgressHome: jest.fn(),
  loadCurrentUserExerciseProgress: (...args: unknown[]) => mockLoadExerciseProgress(...args),
}));
jest.mock("@/features/workouts/services/workoutApplication", () => ({
  addCurrentUserActiveWorkoutExercise: jest.fn(),
  completeCurrentUserSet: jest.fn(),
  deleteCurrentUserHistoricalWorkout: jest.fn(),
  deleteCurrentUserSet: jest.fn(),
  discardCurrentUserActiveWorkout: jest.fn(),
  editCurrentUserHistoricalSet: jest.fn(),
  editCurrentUserSet: jest.fn(),
  finishCurrentUserWorkout: jest.fn(),
  loadCurrentUserCompletedWorkoutSummary: jest.fn(),
  loadCurrentUserWorkoutHistory: jest.fn(),
  loadCurrentUserWorkoutHistoryDetail: jest.fn(),
  loadCurrentUserWorkoutHome: jest.fn(),
  moveCurrentUserActiveWorkoutExercise: jest.fn(),
  removeCurrentUserActiveWorkoutExercise: jest.fn(),
  requestCurrentUserWorkoutStart: jest.fn(),
  undoCurrentUserSetCompletion: jest.fn(),
  updateCurrentUserActiveWorkoutNote: jest.fn(),
}));
jest.mock("@/features/workouts/services/workoutRecoveryContext", () => ({
  loadAndRememberActiveExercise: jest.fn(),
  loadRecoveryWorkoutOverview: jest.fn(),
}));
jest.mock("@/features/templates/services/templateApplication", () => ({
  listCurrentUserTemplates: jest.fn(),
}));
jest.mock("@/features/exercises/services/loadExerciseLibrary", () => ({
  loadExerciseLibrary: jest.fn(),
}));
jest.mock("@/features/exercises/services/loadExercisePreferences", () => ({
  loadExercisePreferences: jest.fn(),
}));
jest.mock("@/features/ai/api", () => ({
  recommendationExplanationApi: { explain: jest.fn() },
  workoutParserApi: { parse: jest.fn() },
}));

import TabsLayout from "@/app/(tabs)/_layout";
import CoachRoute from "@/app/(tabs)/coach";
import HomeRoute from "@/app/(tabs)/home";
import ProgressRoute from "@/app/(tabs)/progress";
import WorkoutsRoute from "@/app/(tabs)/workouts";
import ExerciseProgressRoute from "@/app/progress/[id]";
import ActiveWorkoutOverviewRoute from "@/app/workout/[id]";
import ActiveExerciseLoggingRoute from "@/app/workout/[id]/exercise/[workoutExerciseId]";
import WorkoutSummaryRoute from "@/app/workout/[id]/summary";
import WorkoutHistoryDetailRoute from "@/app/workout/history/[id]";
import WorkoutHistoryRoute from "@/app/workout/history/index";

describe("Expo Router navigation adapters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTabScreens.length = 0;
    mockInitialTabRoute = undefined;
    mockParams = {};
  });

  it("registers all five authenticated tabs with Home as the initial route", async () => {
    await render(<TabsLayout />);

    expect(mockInitialTabRoute).toBe("home");
    expect(mockTabScreens).toEqual([
      { name: "home", title: "Home" },
      { name: "workouts", title: "Workouts" },
      { name: "progress", title: "Progress" },
      { name: "coach", title: "Coach" },
      { name: "profile", title: "Profile" },
    ]);
  });

  it("connects Home, templates, history, Progress, and Coach tab routes", async () => {
    await render(<HomeRoute />);
    mockHomeProps?.onOpenWorkout("workout-a");
    expect(mockPush).toHaveBeenLastCalledWith("/workout/workout-a");

    await render(<WorkoutsRoute />);
    mockWorkoutsProps?.onCreate();
    mockWorkoutsProps?.onOpen("template-a");
    mockWorkoutsProps?.onOpenHistory();
    expect(mockPush.mock.calls.map(([path]) => path)).toEqual([
      "/workout/workout-a",
      "/template/new",
      "/template/template-a",
      "/workout/history",
    ]);

    await render(<ProgressRoute />);
    mockProgressProps?.onOpenExercise("exercise-a");
    expect(mockPush).toHaveBeenLastCalledWith("/progress/exercise-a");
    await expect(render(<CoachRoute />)).resolves.toBeDefined();
  });

  it("connects active workout overview, exercise, Coach, and summary paths", async () => {
    mockParams = { id: "workout-a" };
    await render(<ActiveWorkoutOverviewRoute />);
    mockWorkoutOverviewProps?.onOpenExercise("workout-exercise-a");
    mockWorkoutOverviewProps?.onWorkoutFinished();
    expect(mockPush).toHaveBeenCalledWith("/workout/workout-a/exercise/workout-exercise-a");
    expect(mockReplace).toHaveBeenCalledWith("/workout/workout-a/summary");

    mockParams = { id: "workout-a", workoutExerciseId: "workout-exercise-a" };
    await render(<ActiveExerciseLoggingRoute />);
    mockExerciseLoggingProps?.onAskCoach();
    mockExerciseLoggingProps?.onOpenExercise("workout-exercise-b");
    mockExerciseLoggingProps?.onOverview();
    expect(mockPush).toHaveBeenCalledWith(
      "/workout/workout-a/coach?workoutExerciseId=workout-exercise-a",
    );
    expect(mockReplace).toHaveBeenCalledWith(
      "/workout/workout-a/exercise/workout-exercise-b",
    );
    expect(mockReplace).toHaveBeenCalledWith("/workout/workout-a");

    await render(<WorkoutSummaryRoute />);
    mockWorkoutSummaryProps?.onDone();
    expect(mockReplace).toHaveBeenCalledWith("/home");
  });

  it("connects workout history and exercise progress detail routes", async () => {
    await render(<WorkoutHistoryRoute />);
    mockWorkoutHistoryProps?.onOpenWorkout("completed-a");
    expect(mockPush).toHaveBeenCalledWith("/workout/history/completed-a");

    mockParams = { id: "completed-a" };
    await render(<WorkoutHistoryDetailRoute />);
    mockWorkoutHistoryDetailProps?.onDeleted();
    expect(mockReplace).toHaveBeenCalledWith("/workout/history");

    mockParams = { id: "exercise-a" };
    await render(<ExerciseProgressRoute />);
    await mockExerciseProgressProps?.loadProgress();
    expect(mockLoadExerciseProgress).toHaveBeenCalledWith("exercise-a");
  });
});
