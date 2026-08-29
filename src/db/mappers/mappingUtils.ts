import { z } from "zod";

import type { SQLiteBoolean } from "./rows";

export function fromNullable<T>(value: T | null): T | undefined {
  return value ?? undefined;
}

export function toNullable<T>(value: T | undefined): T | null {
  return value ?? null;
}

export function fromSQLiteBoolean(value: number, fieldName: string): boolean {
  if (value === 0) {
    return false;
  }

  if (value === 1) {
    return true;
  }

  throw new Error(`Invalid SQLite boolean for ${fieldName}: ${value}`);
}

export function toSQLiteBoolean(value: boolean): SQLiteBoolean {
  return value ? 1 : 0;
}

export function parsePersistedJson<T>(
  value: string,
  schema: z.ZodType<T>,
  fieldName: string,
): T {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`Invalid persisted JSON for ${fieldName}.`);
  }

  const result = schema.safeParse(parsed);

  if (!result.success) {
    throw new Error(`Invalid persisted value for ${fieldName}.`);
  }

  return result.data;
}
