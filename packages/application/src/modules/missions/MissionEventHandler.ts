import type { GameEvent } from "@fortuna/domain";
import type { GameEventService } from "../../gameplay/GameEventService.js";
import type { GameplayPortfolioSnapshot } from "../../gameplay/GameplaySnapshots.js";
import type { MissionService } from "../../missions/MissionService.js";
import type { LoggerPort } from "../../ports/LoggerPort.js";
import type { AppEvent } from "../../events/AppEvent.js";
import type { EventHandler } from "../../events/EventHandler.js";

export type MissionPortfolioProvider = (
  playerId: string,
) => Promise<GameplayPortfolioSnapshot | undefined>;

const GAME_EVENT_BY_APP_EVENT: Record<string, GameEvent["type"] | undefined> = {
  AssetBought: "ASSET_PURCHASED",
  AssetSold: "ASSET_SOLD",
  YieldCollected: "INCOME_COLLECTED",
  CycleAdvanced: "MARKET_CYCLE_ADVANCED",
  PortfolioEvaluated: "PORTFOLIO_UPDATED",
};

export class MissionEventHandler implements EventHandler {
  readonly name = "MissionEventHandler";
  readonly critical = false;

  constructor(
    private readonly missions: MissionService,
    private readonly gameEvents: GameEventService,
    private readonly portfolioSnapshot?: MissionPortfolioProvider,
    private readonly logger?: LoggerPort,
  ) {}

  async handle(event: AppEvent): Promise<void> {
    const gameEventType = GAME_EVENT_BY_APP_EVENT[event.type];
    if (!gameEventType) {
      return;
    }

    const gameEvent = this.gameEvents.create(
      event.playerId,
      gameEventType,
      toMetadata(event),
      sourceFor(event.type),
      event.metadata.correlationId,
    );
    const portfolio = await this.portfolioSnapshot?.(event.playerId);
    const result = await this.missions.processEvents(
      event.playerId,
      [gameEvent],
      portfolio,
      event.metadata.correlationId,
    );

    this.logger?.info("Missions reacted to application event", {
      module: "missions",
      action: "mission_progress_flow_completed",
      correlationId: event.metadata.correlationId,
      context: {
        playerId: event.playerId,
        sourceEventType: event.type,
        completedMissionCount: result.completedEvents.length,
      },
    });
  }
}

function sourceFor(eventType: string): GameEvent["source"] {
  return eventType.startsWith("Asset") || eventType.startsWith("Yield")
    ? "FINANCIAL_EVENT"
    : "GAMEPLAY";
}

function toMetadata(event: AppEvent): Record<string, string | number | boolean> {
  const metadata: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(event.payload)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      metadata[key] = value;
    }
  }

  return metadata;
}
