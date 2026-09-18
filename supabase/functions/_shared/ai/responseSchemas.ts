import { z } from "zod";

import { rpeSchema } from "@/shared/schemas";

export const coachProviderOutputSchema = z
  .object({
    answer: z.string().trim().min(1).max(2_000),
    recommendation: z
      .object({
        action: z.string().trim().min(1).max(300),
        rationale: z.string().trim().min(1).max(1_000),
      })
      .strict()
      .nullable()
      .optional(),
    warnings: z.array(z.string().trim().min(1).max(500)).max(5),
  })
  .strict();

export type CoachProviderOutput = z.infer<typeof coachProviderOutputSchema>;

export const coachProviderJSONSchema = {
  type: "object",
  properties: {
    answer: { type: "string" },
    recommendation: {
      type: ["object", "null"],
      properties: {
        action: { type: "string" },
        rationale: { type: "string" },
      },
      required: ["action", "rationale"],
      additionalProperties: false,
    },
    warnings: { type: "array", items: { type: "string" }, maxItems: 5 },
  },
  required: ["answer", "recommendation", "warnings"],
  additionalProperties: false,
} as const;

export const explanationProviderOutputSchema = z
  .object({
    headline: z.string().trim().min(1).max(200),
    summary: z.string().trim().min(1).max(1_500),
    evidence: z.array(z.string().trim().min(1).max(500)).max(6),
    caution: z.string().trim().min(1).max(500).nullable().optional(),
  })
  .strict();

export const explanationProviderJSONSchema = {
  type: "object",
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    evidence: { type: "array", items: { type: "string" }, maxItems: 6 },
    caution: { type: ["string", "null"] },
  },
  required: ["headline", "summary", "evidence", "caution"],
  additionalProperties: false,
} as const;

export const parserProviderOutputSchema = z
  .object({
    sets: z
      .array(
        z
          .object({
            weight: z.number().finite().positive().nullable().optional(),
            unit: z.enum(["lb", "kg"]).nullable().optional(),
            reps: z.number().int().positive(),
            rpe: rpeSchema.nullable().optional(),
          })
          .strict(),
      )
      .max(20),
    confidence: z.enum(["low", "medium", "high"]),
    ambiguities: z.array(z.string().trim().min(1).max(500)).max(10),
  })
  .strict();

export const parserProviderJSONSchema = {
  type: "object",
  properties: {
    sets: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        properties: {
          weight: { type: ["number", "null"], exclusiveMinimum: 0 },
          unit: { type: ["string", "null"], enum: ["lb", "kg", null] },
          reps: { type: "integer", minimum: 1 },
          rpe: { type: ["number", "null"], enum: [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, null] },
        },
        required: ["weight", "unit", "reps", "rpe"],
        additionalProperties: false,
      },
    },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    ambiguities: { type: "array", items: { type: "string" }, maxItems: 10 },
  },
  required: ["sets", "confidence", "ambiguities"],
  additionalProperties: false,
} as const;

export type ExplanationProviderOutput = z.infer<typeof explanationProviderOutputSchema>;
export type ParserProviderOutput = z.infer<typeof parserProviderOutputSchema>;
