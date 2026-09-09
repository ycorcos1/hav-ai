import { fireEvent, render } from "@testing-library/react-native";

import { SetInputRow } from "@/features/workouts/components/SetInputRow";

describe("quick rep adjustments", () => {
  it("increments from blank, decrements without crossing one, and supports repeated taps", async () => {
    const rendered = await render(
      <SetInputRow
        initialWeightKg={80}
        onComplete={jest.fn()}
        requiresWeight
        rpePreference="hidden"
        weightUnit="kg"
      />,
    );
    const reps = rendered.getByLabelText("Reps");

    expect(reps).toHaveProp("value", "");
    await fireEvent.press(rendered.getByRole("button", { name: "Decrease reps" }));
    expect(reps).toHaveProp("value", "");
    await fireEvent.press(rendered.getByRole("button", { name: "Increase reps" }));
    await fireEvent.press(rendered.getByRole("button", { name: "Increase reps" }));
    await fireEvent.press(rendered.getByRole("button", { name: "Increase reps" }));
    expect(reps).toHaveProp("value", "3");
    await fireEvent.press(rendered.getByRole("button", { name: "Decrease reps" }));
    await fireEvent.press(rendered.getByRole("button", { name: "Decrease reps" }));
    await fireEvent.press(rendered.getByRole("button", { name: "Decrease reps" }));
    expect(reps).toHaveProp("value", "1");
  });

  it("preserves manual entry and completes with the adjusted rep value", async () => {
    const onComplete = jest.fn();
    const rendered = await render(
      <SetInputRow
        initialWeightKg={80}
        onComplete={onComplete}
        requiresWeight
        rpePreference="optional"
        weightUnit="kg"
      />,
    );
    await fireEvent.changeText(rendered.getByLabelText("Reps"), "8");
    await fireEvent.press(rendered.getByRole("button", { name: "Increase reps" }));
    await fireEvent.press(rendered.getByRole("button", { name: "Complete Set" }));

    expect(onComplete).toHaveBeenCalledWith({ reps: 9, weightKg: 80 });
  });

  it("does not turn invalid manual text into a completed set", async () => {
    const onComplete = jest.fn();
    const rendered = await render(
      <SetInputRow
        initialWeightKg={80}
        onComplete={onComplete}
        requiresWeight
        rpePreference="hidden"
        weightUnit="kg"
      />,
    );
    await fireEvent.changeText(rendered.getByLabelText("Reps"), "2.5");
    await fireEvent.press(rendered.getByRole("button", { name: "Increase reps" }));
    expect(rendered.getByLabelText("Reps")).toHaveProp("value", "2.5");
    expect(rendered.getByRole("button", { name: "Complete Set" })).toBeDisabled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("keeps weight adjustment and previous-weight prefill behavior intact", async () => {
    const rendered = await render(
      <SetInputRow
        initialWeightKg={82.5}
        onComplete={jest.fn()}
        requiresWeight
        rpePreference="hidden"
        weightUnit="kg"
      />,
    );
    expect(rendered.getByLabelText("Weight (kg)")).toHaveProp("value", "82.5");
    await fireEvent.press(rendered.getByRole("button", { name: "Increase weight by 2.5 kg" }));
    await fireEvent.press(rendered.getByRole("button", { name: "Increase reps" }));
    expect(rendered.getByLabelText("Weight (kg)")).toHaveProp("value", "85");
    expect(rendered.getByLabelText("Reps")).toHaveProp("value", "1");
  });
});
