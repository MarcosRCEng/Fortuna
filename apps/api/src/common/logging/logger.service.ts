import { Injectable } from "@nestjs/common";
import pino, { type Logger } from "pino";
import { RequestContextService } from "./request-context.service.js";

export type StructuredLogLevel = "info" | "warn" | "error";

export interface StructuredLogPayload {
  context: string;
  message: string;
  playerId?: string;
  eventType?: string;
  operation?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  error?: unknown;
  correlationId?: string;
}

@Injectable()
export class StructuredLoggerService {
  private readonly logger: Logger;

  constructor(private readonly requestContext?: RequestContextService) {
    this.logger = pino({
      level: process.env.LOG_LEVEL ?? "info",
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label }),
      },
      redact: {
        paths: ["metadata.password", "metadata.token", "metadata.authorization"],
        remove: true,
      },
    });
  }

  info(payload: StructuredLogPayload): void {
    this.write("info", payload);
  }

  warn(payload: StructuredLogPayload): void {
    this.write("warn", payload);
  }

  error(payload: StructuredLogPayload): void {
    this.write("error", payload);
  }

  private write(level: StructuredLogLevel, payload: StructuredLogPayload): void {
    const { message, error, ...rest } = payload;
    const safeError =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            ...(process.env.NODE_ENV !== "production" ? { stack: error.stack } : {}),
          }
        : error;

    this.logger[level](
      {
        correlationId:
          payload.correlationId ??
          this.requestContext?.getCorrelationId() ??
          RequestContextService.getCorrelationId(),
        context: rest.context,
        playerId: rest.playerId,
        eventType: rest.eventType,
        operation: rest.operation,
        durationMs: rest.durationMs,
        metadata: rest.metadata,
        error: safeError,
      },
      message,
    );
  }
}
