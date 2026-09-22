import { environment } from "@/lib/environment";

import { createLogger } from "./logger";

export type { Logger, LoggerSink, LogMetadata } from "./logger";
export { createLogger } from "./logger";

export const logger = createLogger(environment.appEnvironment);
