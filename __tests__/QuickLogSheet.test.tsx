import { fireEvent, render, within } from "@testing-library/react-native";

import { QuickLogSheet } from "@/features/workouts/components/QuickLogSheet";
import { NetworkStatusProvider } from "@/features/network/components/NetworkStatusProvider";
import type { NetworkStatusService } from "@/features/network/networkStatus";

describe("QuickLogSheet", () => {
  it("parses into editable candidates and confirms through normal set callbacks", async () => {
    const parseWorkout = jest.fn().mockResolvedValue({
      sets: [
        { weight: 185, unit: "lb", reps: 8 },
        { weight: 185, unit: "lb", reps: 7, rpe: 9 },
      ],
      confidence: "high",
      ambiguities: [],
      meta: { promptVersion: "parser-v1" },
    });
    const onCompleteSet = jest.fn().mockResolvedValue(true);
    const onDismiss = jest.fn();
    const screen = await render(
      <QuickLogSheet
        displayUnit="lb"
        exerciseId="11111111-1111-4111-8111-111111111111"
        onCompleteSet={onCompleteSet}
        onDismiss={onDismiss}
        parseWorkout={parseWorkout}
        requiresWeight
        visible
      />,
    );

    await fireEvent.changeText(screen.getByLabelText("Quick Log workout text"), "185 for 8, 7 @ 9");
    await fireEvent.press(screen.getByRole("button", { name: "Parse Sets" }));
    const secondSet = await screen.findByLabelText("Quick Log set 2");
    await fireEvent.changeText(within(secondSet).getByLabelText("Reps"), "6");
    expect(onCompleteSet).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("button", { name: "Confirm Sets" }));
    expect(onCompleteSet).toHaveBeenNthCalledWith(1, expect.objectContaining({
      reps: 8,
      weightKg: expect.closeTo(83.9146, 4),
    }));
    expect(onCompleteSet).toHaveBeenNthCalledWith(2, expect.objectContaining({
      reps: 6,
      rpe: 9,
      weightKg: expect.closeTo(83.9146, 4),
    }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("surfaces ambiguity without saving automatically", async () => {
    const onCompleteSet = jest.fn();
    const screen = await render(
      <QuickLogSheet
        displayUnit="kg"
        exerciseId="11111111-1111-4111-8111-111111111111"
        onCompleteSet={onCompleteSet}
        onDismiss={jest.fn()}
        parseWorkout={jest.fn().mockResolvedValue({
          sets: [{ weight: 80, unit: "kg", reps: 8 }],
          confidence: "low",
          ambiguities: ["It is unclear whether 9 means reps or RPE."],
          meta: { promptVersion: "parser-v1" },
        })}
        requiresWeight
        visible
      />,
    );

    await fireEvent.changeText(screen.getByLabelText("Quick Log workout text"), "80 for 8 maybe 9");
    await fireEvent.press(screen.getByRole("button", { name: "Parse Sets" }));
    expect(await screen.findByText("Check this: It is unclear whether 9 means reps or RPE.")).toBeOnTheScreen();
    expect(onCompleteSet).not.toHaveBeenCalled();
  });

  it("keeps only unsaved candidates after a partial persistence failure", async () => {
    const onCompleteSet = jest.fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const screen = await render(
      <QuickLogSheet
        displayUnit="kg"
        exerciseId="11111111-1111-4111-8111-111111111111"
        onCompleteSet={onCompleteSet}
        onDismiss={jest.fn()}
        parseWorkout={jest.fn().mockResolvedValue({
          sets: [{ weight: 80, reps: 8 }, { weight: 80, reps: 7 }],
          confidence: "high",
          ambiguities: [],
          meta: { promptVersion: "parser-v1" },
        })}
        requiresWeight
        visible
      />,
    );

    await fireEvent.changeText(screen.getByLabelText("Quick Log workout text"), "80 for 8, 7");
    await fireEvent.press(screen.getByRole("button", { name: "Parse Sets" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Confirm Sets" }));
    expect(await screen.findByText(/Already completed sets remain saved/)).toBeOnTheScreen();
    expect(screen.getAllByLabelText(/Quick Log set/)).toHaveLength(1);
  });

  it("does not invoke parsing while clearly offline", async () => {
    const parseWorkout = jest.fn();
    const offlineService: NetworkStatusService = {
      getCurrentStatus: async () => "offline",
      subscribe: () => () => {},
    };
    const screen = await render(
      <NetworkStatusProvider service={offlineService}>
        <QuickLogSheet
          displayUnit="kg"
          exerciseId="11111111-1111-4111-8111-111111111111"
          onCompleteSet={jest.fn()}
          onDismiss={jest.fn()}
          parseWorkout={parseWorkout}
          requiresWeight
          visible
        />
      </NetworkStatusProvider>,
    );

    expect(await screen.findByText(/Quick Log requires an internet connection/)).toBeOnTheScreen();
    expect(screen.getByLabelText("Quick Log workout text")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Parse Sets" })).toBeDisabled();
    expect(parseWorkout).not.toHaveBeenCalled();
  });
});
