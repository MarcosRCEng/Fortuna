import type { LoggerPort } from "../../ports/LoggerPort.js";
import type { AppEvent } from "../../events/AppEvent.js";
import type { EventHandler } from "../../events/EventHandler.js";

export interface MentorEventService {
  evaluateForEvent(event: AppEvent): Promise<unknown[]>;
}

export class MentorEventHandler implements EventHandler {
  readonly name = "MentorEventHandler";
  readonly critical = false;

  constructor(
    private readonly mentor: MentorEventService,
    private readonly logger?: LoggerPort,
  ) {}

  async handle(event: AppEvent): Promise<void> {
    const tips = await this.mentor.evaluateForEvent(event);
    this.logger?.info("Mentor reacted to application event", {
      module: "mentor",
      action: "mentor_tip_flow_completed",
      correlationId: event.metadata.correlationId,
      context: {
        playerId: event.playerId,
        sourceEventType: event.type,
        generatedTipCount: tips.length,
      },
    });
  }
}
