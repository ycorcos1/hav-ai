import type { AppEnvironment } from "@/shared/contracts";

export type LogMetadata = Readonly<Record<string, unknown>>;

export type Logger = {
  debug: (message: string, metadata?: LogMetadata) => void;
  error: (message: string, metadata?: LogMetadata) => void;
  info: (message: string, metadata?: LogMetadata) => void;
  warn: (message: string, metadata?: LogMetadata) => void;
};

type LogLevel = keyof Logger;

export type LoggerSink = Pick<Console, LogLevel>;

const redacted = "[REDACTED]";
const sensitiveKey = /(authorization|cookie|credential|password|secret|service.?role|api.?key|access.?token|refresh.?token|id.?token|database.?url|publishable.?key)/i;
const sensitiveTextPatterns = [
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /\bsk-[A-Za-z0-9_-]{12,}\b/g,
  /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+\b/g,
] as const;

export function createLogger(
  environment: AppEnvironment,
  sink: LoggerSink = console,
): Logger {
  function write(level: LogLevel, message: string, metadata?: LogMetadata): void {
    if (!isEnabled(environment, level)) return;
    const output = `[havAI] ${level}: ${sanitizeText(message)}`;
    if (!metadata) {
      sink[level](output);
      return;
    }
    sink[level](output, sanitizeValue(metadata, new WeakSet(), 0));
  }

  return {
    debug: (message, metadata) => write("debug", message, metadata),
    error: (message, metadata) => write("error", message, metadata),
    info: (message, metadata) => write("info", message, metadata),
    warn: (message, metadata) => write("warn", message, metadata),
  };
}

function isEnabled(environment: AppEnvironment, level: LogLevel): boolean {
  if (environment === "development") return true;
  if (environment === "preview") return level !== "debug";
  return level === "warn" || level === "error";
}

function sanitizeText(value: string): string {
  return sensitiveTextPatterns.reduce(
    (sanitized, pattern) => sanitized.replace(pattern, redacted),
    value,
  );
}

function sanitizeValue(
  value: unknown,
  seen: WeakSet<object>,
  depth: number,
): unknown {
  if (typeof value === "string") return sanitizeText(value);
  if (value === null || typeof value !== "object") return value;
  if (depth >= 6) return "[MAX_DEPTH]";
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);

  if (value instanceof Error) {
    return { name: value.name, message: sanitizeText(value.message) };
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry, seen, depth + 1));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      sensitiveKey.test(key) ? redacted : sanitizeValue(entry, seen, depth + 1),
    ]),
  );
}
