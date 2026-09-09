import { fireEvent, render } from "@testing-library/react-native";

import { SetInputRow } from "@/features/workouts/components/SetInputRow";
import { WeightAdjustmentControls } from "@/features/workouts/components/WeightAdjustmentControls";

describe.each([
  ["lb" as const, [5, 10, 25, 45]],
  ["kg" as const, [2.5, 5, 10, 20]],
])("%s quick weight adjustments", (weightUnit, unitIncrements) => {
  it.each(unitIncrements)("supports increasing and decreasing by %s", async (increment) => {
    const onChange = jest.fn();
    const rendered = await render(
      <WeightAdjustmentControls
        onChange={onChange}
        value="100"
        weightUnit={weightUnit}
      />,
    );
    if (increment !== unitIncrements[0]) {
      await fireEvent.press(rendered.getByRole("button", {
        name: "Show larger weight adjustments",
      }));
    }

    await fireEvent.press(rendered.getByRole("button", {
      name: `Increase weight by ${increment} ${weightUnit}`,
    }));
    expect(onChange).toHaveBeenLastCalledWith(String(100 + increment));
    await fireEvent.press(rendered.getByRole("button", {
      name: `Decrease weight by ${increment} ${weightUnit}`,
    }));
    expect(onChange).toHaveBeenLastCalledWith(String(100 - increment));
  });
});

describe("quick weight adjustment integration", () => {
  it("keeps manual entry and converts the adjusted pound draft once on completion", async () => {
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
    await fireEvent.press(rendered.getByRole("button", { name: "Increase weight by 5 lb" }));
    expect(rendered.getByLabelText("Weight (lb)")).toHaveProp("value", "186.88");
    await fireEvent.changeText(rendered.getByLabelText("Weight (lb)"), "190");
    await fireEvent.changeText(rendered.getByLabelText("Reps"), "8");
    await fireEvent.press(rendered.getByRole("button", { name: "Complete Set" }));
    expect(onComplete.mock.calls[0][0].weightKg).toBeCloseTo(86.18255, 4);
  });

  it("preserves decimal kilogram increments and never produces a negative draft", async () => {
    const rendered = await render(
      <SetInputRow
        initialWeightKg={2.5}
        onComplete={jest.fn()}
        requiresWeight
        rpePreference="hidden"
        weightUnit="kg"
      />,
    );
    await fireEvent.press(rendered.getByRole("button", { name: "Increase weight by 2.5 kg" }));
    expect(rendered.getByLabelText("Weight (kg)")).toHaveProp("value", "5");
    await fireEvent.press(rendered.getByRole("button", { name: "Decrease weight by 2.5 kg" }));
    await fireEvent.press(rendered.getByRole("button", { name: "Decrease weight by 2.5 kg" }));
    await fireEvent.press(rendered.getByRole("button", { name: "Decrease weight by 2.5 kg" }));
    expect(rendered.getByLabelText("Weight (kg)")).toHaveProp("value", "0");
  });

  it("works with previous-set prefill without changing duplicate completion protection", async () => {
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
    await fireEvent.changeText(rendered.getByLabelText("Reps"), "8");
    await fireEvent.press(rendered.getByRole("button", { name: "Increase weight by 2.5 kg" }));
    await fireEvent.press(rendered.getByRole("button", { name: "Complete Set" }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({ reps: 8, weightKg: 82.5 });
  });
});
