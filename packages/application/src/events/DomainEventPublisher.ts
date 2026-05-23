import type { FinancialEvent } from "@fortuna/domain";
import type { LoggerPort } from "../ports/LoggerPort.js";
import type { DispatchReport, EventDispatcher } from "./EventDispatcher.js";
import { toAppEvents } from "./FinancialEventMapper.js";

export class DomainEventPublisher {
  constructor(
    private readonly dispatcher: EventDispatcher,
    private readonly eventId: () => string,
    private readonly logger?: LoggerPort,
  ) {}

  async publishFinancialEvents(
    events: FinancialEvent[],
    options: { correlationId?: string; causationId?: string } = {},
  ): Promise<DispatchReport> {
    const appEvents = toAppEvents(events, {
      eventId: this.eventId,
      correlationId: options.correlationId,
      causationId: options.causationId,
    });

    const report = await this.dispatcher.dispatchAll(appEvents);
    this.logger?.info("Financial domain events published", {
      module: "events",
      action: "financial_events_published",
      correlationId: options.correlationId,
      context: {
        domainEventTypes: events.map((event) => event.type),
        applicationEventTypes: appEvents.map((event) => event.type),
        handlersExecuted: report.handlers.filter(
          (handler) => handler.status === "executed",
        ).length,
        handlersFailed: report.handlers.filter(
          (handler) => handler.status === "failed",
        ).length,
      },
    });

    return report;
  }
}
