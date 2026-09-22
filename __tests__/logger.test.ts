import { createLogger, type LoggerSink } from "@/lib/logger/logger";

function sink(): jest.Mocked<LoggerSink> {
  return {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}

describe("central logger", () => {
  it("supports all levels in development", () => {
    const output = sink();
    const logger = createLogger("development", output);

    logger.debug("debug message");
    logger.info("info message");
    logger.warn("warn message");
    logger.error("error message");

    expect(output.debug).toHaveBeenCalledWith("[havAI] debug: debug message");
    expect(output.info).toHaveBeenCalledWith("[havAI] info: info message");
    expect(output.warn).toHaveBeenCalledWith("[havAI] warn: warn message");
    expect(output.error).toHaveBeenCalledWith("[havAI] error: error message");
  });

  it("keeps production output minimal", () => {
    const output = sink();
    const logger = createLogger("production", output);

    logger.debug("hidden");
    logger.info("hidden");
    logger.warn("visible");
    logger.error("visible");

    expect(output.debug).not.toHaveBeenCalled();
    expect(output.info).not.toHaveBeenCalled();
    expect(output.warn).toHaveBeenCalledTimes(1);
    expect(output.error).toHaveBeenCalledTimes(1);
  });

  it("redacts nested secret fields and recognizable credentials", () => {
    const output = sink();
    const logger = createLogger("development", output);

    logger.error("Failed with Bearer abc.def.ghi and sk-privatecredential", {
      authorization: "Bearer do-not-log",
      nested: {
        accessToken: "token-value",
        requestId: "request-safe",
        providerMessage: "Credential sb_secret_do-not-log failed",
      },
      error: new Error("Bearer provider-token rejected"),
    });

    const serialized = JSON.stringify(output.error.mock.calls);
    expect(serialized).not.toContain("abc.def.ghi");
    expect(serialized).not.toContain("sk-privatecredential");
    expect(serialized).not.toContain("do-not-log");
    expect(serialized).not.toContain("provider-token");
    expect(serialized).toContain("request-safe");
    expect(serialized).toContain("[REDACTED]");
  });
});
