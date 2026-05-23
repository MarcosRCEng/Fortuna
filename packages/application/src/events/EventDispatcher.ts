import type { LoggerPort } from "../ports/LoggerPort.js";
import type { AppEvent } from "./AppEvent.js";
import type { EventHandler } from "./EventHandler.js";

export interface HandlerExecution {
  eventId: string;
  eventType: string;
  handlerName: string;
  status: "executed" | "failed";
  critical: boolean;
  error?: unknown;
}

export interface DispatchReport {
  eventsPublished: string[];
  handlers: HandlerExecution[];
}

export class EventDispatcher {
  private readonly handlersByType = new Map<string, EventHandler[]>();

  constructor(private readonly logger?: LoggerPort) {}

  register<TEvent extends AppEvent>(
    eventType: TEvent["type"],
    handler: EventHandler<TEvent>,
  ): void {
    const current = this.handlersByType.get(eventType) ?? [];
    current.push(handler as EventHandler);
    this.handlersByType.set(eventType, current);
  }

  async dispatch(event: AppEvent): Promise<DispatchReport> {
    const handlers = this.handlersByType.get(event.type) ?? [];
    const report: DispatchReport = {
      eventsPublished: [event.type],
      handlers: [],
    };

    this.logger?.info("Application event published", {
      module: "events",
      action: "event_published",
      correlationId: event.metadata.correlationId,
      context: {
        eventId: event.id,
        eventType: event.type,
        playerId: event.playerId,
        handlerCount: handlers.length,
      },
    });

    for (const handler of handlers) {
      const critical = handler.critical === true;
      try {
        await handler.handle(event);
        report.handlers.push({
          eventId: event.id,
          eventType: event.type,
          handlerName: handler.name,
          status: "executed",
          critical,
        });
        this.logger?.debug("Application event handler executed", {
          module: "events",
          action: "event_handler_executed",
          correlationId: event.metadata.correlationId,
          context: {
            eventId: event.id,
            eventType: event.type,
            handlerName: handler.name,
            critical,
          },
        });
      } catch (error) {
        report.handlers.push({
          eventId: event.id,
          eventType: event.type,
          handlerName: handler.name,
          status: "failed",
          critical,
          error,
        });
        this.logger?.error("Application event handler failed", {
          module: "events",
          action: "event_handler_failed",
          correlationId: event.metadata.correlationId,
          context: {
            eventId: event.id,
            eventType: event.type,
            handlerName: handler.name,
            critical,
          },
          error,
        });

        if (critical) {
          throw error;
        }
      }
    }

    return report;
  }

  async dispatchAll(events: AppEvent[]): Promise<DispatchReport> {
    const combined: DispatchReport = {
      eventsPublished: [],
      handlers: [],
    };

    for (const event of events) {
      const report = await this.dispatch(event);
      combined.eventsPublished.push(...report.eventsPublished);
      combined.handlers.push(...report.handlers);
    }

    return combined;
  }
}
