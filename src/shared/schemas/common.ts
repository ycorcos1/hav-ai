import { z } from "zod";

import type { AppEnvironment, RPE } from "@/shared/contracts";

export const appEnvironmentSchema = z.enum([
  "development",
  "preview",
  "production",
]) satisfies z.ZodType<AppEnvironment>;

export const rpeSchema = z.union([
  z.literal(6),
  z.literal(6.5),
  z.literal(7),
  z.literal(7.5),
  z.literal(8),
  z.literal(8.5),
  z.literal(9),
  z.literal(9.5),
  z.literal(10),
]) satisfies z.ZodType<RPE>;

export const uuidSchema = z.string().uuid();

export const isoDateTimeSchema = z.string().datetime({ offset: true });

export const weightKgSchema = z.number().finite().nonnegative();
