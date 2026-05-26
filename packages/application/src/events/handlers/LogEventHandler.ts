import type { LoggerPort } from "../../ports/LoggerPort.js";
import type { AppEvent } from "../AppEvent.js";
import type { EventHandler } from "../EventHandler.js";

export class LogEventHandler implements EventHandler {
  readonly name = "LogEventHandler";
  readonly critical = false;

  constructor(private readonly logger: LoggerPort) {}

  async handle(event: AppEvent): Promise<void> {
    this.logger.info("Application side effect event observed", {
      module: "events",
      action: "application_event_observed",
      correlationId: event.metadata.correlationId,
      context: {
        eventId: event.id,
        eventType: event.type,
        playerId: event.playerId,
        source: event.metadata.source,
        version: event.metadata.version,
      },
    });
  }
}
