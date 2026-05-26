import type { LoggerPort, LogPayload } from "@fortuna/application";
import pino, { type Logger } from "pino";

export class PinoLogger implements LoggerPort {
  private readonly logger: Logger;

  constructor(level = process.env.LOG_LEVEL ?? "info") {
    this.logger = pino({
      level,
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label }),
      },
    });
  }

  debug(message: string, payload: LogPayload): void {
    this.logger.debug(this.formatPayload(payload), message);
  }

  info(message: string, payload: LogPayload): void {
    this.logger.info(this.formatPayload(payload), message);
  }

  warn(message: string, payload: LogPayload): void {
    this.logger.warn(this.formatPayload(payload), message);
  }

  error(message: string, payload: LogPayload & { error?: unknown }): void {
    this.logger.error(this.formatPayload(payload), message);
  }

  private formatPayload(payload: LogPayload & { error?: unknown }): Record<string, unknown> {
    return {
      module: payload.module,
      action: payload.action,
      correlationId: payload.correlationId,
      context: payload.context ?? {},
      error: payload.error
    };
  }
}
