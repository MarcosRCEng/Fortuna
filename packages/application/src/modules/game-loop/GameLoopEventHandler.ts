import type { GameLoopService } from "../../gameplay/GameLoopService.js";
import type { GameplayPortfolioSnapshot } from "../../gameplay/GameplaySnapshots.js";
import type { LoggerPort } from "../../ports/LoggerPort.js";
import type { AppEvent } from "../../events/AppEvent.js";
import type { EventHandler } from "../../events/EventHandler.js";

export type PortfolioSnapshotProvider = (
  playerId: string,
) => Promise<GameplayPortfolioSnapshot | undefined>;

export class GameLoopEventHandler implements EventHandler {
  readonly name = "GameLoopEventHandler";
  readonly critical = false;

  constructor(
    private readonly gameLoop: GameLoopService,
    private readonly portfolioSnapshot?: PortfolioSnapshotProvider,
    private readonly logger?: LoggerPort,
  ) {}

  async handle(event: AppEvent): Promise<void> {
    const portfolio = await this.portfolioSnapshot?.(event.playerId);
    const result = await this.gameLoop.handle({
      playerId: event.playerId,
      portfolio,
      correlationId: event.metadata.correlationId,
      advanceMarketCycle: event.type === "CycleAdvanced",
    });

    this.logger?.info("Game loop reacted to application event", {
      module: "game_loop",
      action: "game_loop_event_reacted",
      correlationId: event.metadata.correlationId,
      context: {
        playerId: event.playerId,
        sourceEventType: event.type,
        generatedEventCount: result.events.length,
        cityLevel: result.city.cityLevel,
        mentorFeedbackCount: result.mentorFeedback.length,
      },
    });
  }
}
