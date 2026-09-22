import {
  canonicalWeightKg,
  displayWeightFromKg,
  formatDisplayWeight,
} from "@/features/workouts/services/weightConversion";

describe("canonical workout weight conversion", () => {
  it.each([0, 2.5, 185, 1000])("round-trips %s pounds through canonical kilograms", (pounds) => {
    expect(displayWeightFromKg(canonicalWeightKg(pounds, "lb"), "lb")).toBeCloseTo(pounds, 10);
  });

  it("preserves kilogram values and formats display precision consistently", () => {
    expect(canonicalWeightKg(83.75, "kg")).toBe(83.75);
    expect(displayWeightFromKg(83.75, "kg")).toBe(83.75);
    expect(formatDisplayWeight(83.756, "kg")).toBe("83.76");
    expect(formatDisplayWeight(canonicalWeightKg(185, "lb"), "lb")).toBe("185");
  });
});
