import type { RPE } from "@/shared/contracts";

export class SetValidationError extends Error {}

export function validateSetValues(values: {
  reps: number;
  rpe?: RPE;
  weightKg?: number;
}): void {
  if (!Number.isInteger(values.reps) || values.reps <= 0) {
    throw new SetValidationError("Reps must be a positive whole number.");
  }
  if (
    values.weightKg !== undefined
    && (!Number.isFinite(values.weightKg) || values.weightKg < 0)
  ) {
    throw new SetValidationError("Weight must be a non-negative number.");
  }
  if (values.rpe !== undefined && !validRpeValues.includes(values.rpe)) {
    throw new SetValidationError("RPE must be between 6 and 10 in 0.5 increments.");
  }
}

const validRpeValues: readonly RPE[] = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
