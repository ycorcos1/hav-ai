import { act, cleanup, fireEvent, render } from "@testing-library/react-native";
import { RestTimerProvider } from "@/features/workouts/components/RestTimerProvider";
import { ActiveExerciseLoggingScreen } from "@/features/workouts/screens/ActiveExerciseLoggingScreen";
import type { ActiveWorkoutExercise } from "@/features/workouts/services/workoutApplication";
import type { CompleteSetInput, CompleteSetResult } from "@/shared/contracts";

jest.mock("expo-haptics", () => ({ ImpactFeedbackStyle: { Medium: "medium" }, impactAsync: jest.fn().mockResolvedValue(undefined) }));
const time = "2026-09-09T12:00:00Z";
const exercise = { id: "we", userId: "u", workoutId: "w", exerciseId: "e", position: 0, sets: [], targetWeightKg: 40, createdAt: time, updatedAt: time };
const fixture: ActiveWorkoutExercise = {
  workout: { id: "w", userId: "u", name: "Push", status: "active", startedAt: time, exercises: [exercise], createdAt: time, updatedAt: time },
  workoutExercise: exercise,
  exercise: { id: "e", name: "Bench", primaryMuscleGroup: "chest", secondaryMuscleGroups: [], equipmentType: "barbell", measurementType: "weight_reps", isSystem: true, isArchived: false, createdAt: time, updatedAt: time },
  profile: { userId: "u", weightUnit: "kg", primaryGoal: "hybrid", rpePreference: "optional", progressionStyle: "balanced", defaultRestDurationSeconds: 120, onboardingCompleted: true, createdAt: time, updatedAt: time },
  previousPerformance: null, exercisePreference: null,
};
let nextPosition = 0;
function result(input: CompleteSetInput): CompleteSetResult {
  const position = nextPosition++;
  return { set: { ...input, id: `s-${position}`, userId: "u", position, completedAt: time, createdAt: time, updatedAt: time } };
}
async function setup(data = fixture, complete = jest.fn(async (input: CompleteSetInput) => result(input))) {
  const undo = jest.fn().mockResolvedValue({ restoredDraft: { reps: 8 } });
  const screen = await render(<RestTimerProvider><ActiveExerciseLoggingScreen completeSet={complete} undoSet={undo} loadExercise={async () => data} onOpenExercise={jest.fn()} onOverview={jest.fn()} /></RestTimerProvider>);
  await fireEvent.changeText(screen.getByLabelText("Reps"), "8");
  return { screen, complete, undo };
}
describe("automatic rest timer", () => {
  beforeEach(() => { nextPosition = 0; jest.useFakeTimers(); jest.setSystemTime(0); });
  afterEach(async () => { await cleanup(); jest.useRealTimers(); });
  it("starts only after commit and dismisses after successful matching Undo", async () => {
    let resolve!: (value: CompleteSetResult) => void;
    const pending = new Promise<CompleteSetResult>((done) => { resolve = done; });
    const complete = jest.fn((_input: CompleteSetInput) => pending);
    const { screen } = await setup(fixture, complete);
    await fireEvent.press(screen.getByText("Complete Set"));
    expect(screen.queryByLabelText("Rest timer")).toBeNull();
    await act(async () => { resolve(result(complete.mock.calls[0][0])); await pending; });
    expect(screen.getByText("Rest 2:00")).toBeTruthy();
    await fireEvent.press(screen.getByText("Undo"));
    expect(screen.queryByLabelText("Rest timer")).toBeNull();
  });
  it("uses an exercise override; a failed next completion or Undo leaves the timer intact", async () => {
    const { screen, complete, undo } = await setup({ ...fixture, exercisePreference: { id: "p", userId: "u", exerciseId: "e", isFavorite: false, restDurationSeconds: 90, createdAt: time, updatedAt: time } });
    await fireEvent.press(screen.getByText("Complete Set"));
    expect(screen.getByText("Rest 1:30")).toBeTruthy();
    complete.mockRejectedValueOnce(new Error("disk"));
    await fireEvent.changeText(screen.getByLabelText("Reps"), "7");
    await fireEvent.press(screen.getByText("Complete Set"));
    expect(screen.getByText("Rest 1:30")).toBeTruthy();
    undo.mockRejectedValueOnce(new Error("disk"));
    await fireEvent.press(screen.getByText("Undo"));
    expect(screen.getByText("Rest 1:30")).toBeTruthy();
  });
  it("does not start for warm-ups and isolates invalid timer duration from saved sets", async () => {
    const { screen } = await setup({ ...fixture, profile: { ...fixture.profile, defaultRestDurationSeconds: 0 } });
    await fireEvent.press(screen.getByText("Add Warm-Up Set"));
    await fireEvent.changeText(screen.getByLabelText("Reps"), "8");
    await fireEvent.press(screen.getByText("Complete Set"));
    expect(screen.queryByLabelText("Rest timer")).toBeNull();
    await fireEvent.changeText(screen.getByLabelText("Reps"), "8");
    await fireEvent.press(screen.getByText("Complete Set"));
    expect(screen.getByText(/Your set was saved, but the rest timer/)).toBeTruthy();
    expect(screen.queryByText(/This set could not be saved/)).toBeNull();
  });
});
