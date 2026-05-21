export interface LogPayload {
  module: string;
  action: string;
  correlationId?: string;
  context?: Record<string, unknown>;
}

export interface LoggerPort {
  debug(message: string, payload: LogPayload): void;
  info(message: string, payload: LogPayload): void;
  warn(message: string, payload: LogPayload): void;
  error(message: string, payload: LogPayload & { error?: unknown }): void;
}
