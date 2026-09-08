import { fireEvent, render } from "@testing-library/react-native";

import { SetInputRow } from "@/features/workouts/components/SetInputRow";

describe("SetInputRow", () => {
  it("prefills target weight in pounds and emits canonical kilograms", async () => {
    const onComplete = jest.fn();
    const rendered = await render(
      <SetInputRow
        initialWeightKg={82.5}
        onComplete={onComplete}
        requiresWeight
        rpePreference="optional"
        weightUnit="lb"
      />,
    );

    expect(rendered.getByLabelText("Weight (lb)")).toHaveProp("value", "181.88");
    await fireEvent.changeText(rendered.getByLabelText("Reps"), "8");
    await fireEvent.press(rendered.getByRole("button", { name: "Complete Set" }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0].reps).toBe(8);
    expect(onComplete.mock.calls[0][0].weightKg).toBeCloseTo(82.5, 2);
    expect(onComplete.mock.calls[0][0].rpe).toBeUndefined();
  });

  it("keeps kilograms canonical and supports optional tap-based RPE", async () => {
    const onComplete = jest.fn();
    const rendered = await render(
      <SetInputRow
        initialWeightKg={80}
        onComplete={onComplete}
        requiresWeight
        rpePreference="preferred"
        weightUnit="kg"
      />,
    );

    await fireEvent.changeText(rendered.getByLabelText("Reps"), "6");
    await fireEvent.press(rendered.getByRole("button", { name: "Select RPE" }));
    await fireEvent.press(rendered.getByRole("button", { name: "9" }));
    await fireEvent.press(rendered.getByRole("button", { name: "Complete Set" }));

    expect(onComplete).toHaveBeenCalledWith({ reps: 6, rpe: 9, weightKg: 80 });
  });

  it("supports reps-only exercises and hides RPE when preferred by the profile", async () => {
    const onComplete = jest.fn();
    const rendered = await render(
      <SetInputRow
        onComplete={onComplete}
        requiresWeight={false}
        rpePreference="hidden"
        weightUnit="lb"
      />,
    );

    expect(rendered.queryByLabelText("Weight (lb)")).toBeNull();
    expect(rendered.queryByRole("button", { name: "Select RPE" })).toBeNull();
    await fireEvent.changeText(rendered.getByLabelText("Reps"), "12");
    await fireEvent.press(rendered.getByRole("button", { name: "Complete Set" }));
    expect(onComplete).toHaveBeenCalledWith({ reps: 12 });
  });

  it("rejects invalid entries without invoking completion", async () => {
    const onComplete = jest.fn();
    const rendered = await render(
      <SetInputRow
        onComplete={onComplete}
        requiresWeight
        rpePreference="optional"
        weightUnit="kg"
      />,
    );

    expect(rendered.getByRole("button", { name: "Complete Set" })).toBeDisabled();
    await fireEvent.changeText(rendered.getByLabelText("Weight (kg)"), "invalid");
    await fireEvent.changeText(rendered.getByLabelText("Reps"), "2.5");
    expect(rendered.getByText("Enter a valid weight.")).toBeTruthy();
    expect(rendered.getByText("Enter a whole number above zero.")).toBeTruthy();
    expect(rendered.getByRole("button", { name: "Complete Set" })).toBeDisabled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("does not include controls owned by later tasks", async () => {
    const rendered = await render(
      <SetInputRow
        onComplete={jest.fn()}
        requiresWeight
        rpePreference="optional"
        weightUnit="kg"
      />,
    );

    expect(rendered.queryByText("Add Set")).toBeNull();
    expect(rendered.queryByText("Warm-Up Set")).toBeNull();
    expect(rendered.queryByText("Undo")).toBeNull();
    expect(rendered.queryByText("Notes")).toBeNull();
  });
});
