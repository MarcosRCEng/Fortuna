import type { Asset } from "../ports/MarketDataProvider.js";
import type { MarketDataProvider } from "../ports/MarketDataProvider.js";
import type { GameLoopService } from "../gameplay/GameLoopService.js";
import type { GameLoopResult } from "../gameplay/GameplaySnapshots.js";
import type { EventDispatcher } from "../events/EventDispatcher.js";
import type { LoggerPort } from "../ports/LoggerPort.js";

export interface AdvanceMarketCycleCommand {
  playerId: string;
  cycleDate?: Date;
  cycleIndex?: number;
}

export interface AdvanceMarketCycleResult {
  cycle: {
    playerId: string;
    cycleDate?: Date;
    cycleIndex?: number;
  };
  refreshedAssets: Asset[];
  gameLoop: GameLoopResult;
  impactSummary: {
    refreshedAssetCount: number;
    generatedEventCount: number;
  };
}

export class AdvanceMarketCycleUseCase {
  constructor(
    private readonly marketData: MarketDataProvider,
    private readonly gameLoop: GameLoopService,
    private readonly dispatcher?: EventDispatcher,
    private readonly idGenerator?: () => string,
    private readonly logger?: LoggerPort,
  ) {}

  async execute(
    command: AdvanceMarketCycleCommand,
  ): Promise<AdvanceMarketCycleResult> {
    const startedAt = Date.now();
    const correlationId = command.cycleIndex
      ? `market-cycle-${command.cycleIndex}`
      : `market-cycle-${startedAt}`;

    const refreshedAssets = await this.marketData.refreshPrices({
      asOf: command.cycleDate,
    });
    await this.dispatcher?.dispatch({
      id: this.idGenerator?.() ?? `event-${startedAt}-prices`,
      type: "MarketPricesUpdated",
      playerId: command.playerId,
      occurredAt: command.cycleDate ?? new Date(startedAt),
      metadata: {
        correlationId,
        source: "market-data",
        version: 1,
      },
      payload: {
        cycleId: correlationId,
        updatedAssets: refreshedAssets.map((asset) => ({
          id: asset.id,
          symbol: asset.symbol,
          priceCents: asset.currentPriceCents,
        })),
        occurredAt: (command.cycleDate ?? new Date(startedAt)).toISOString(),
      },
    });
    const gameLoop = await this.gameLoop.handle({
      playerId: command.playerId,
      advanceMarketCycle: true,
      correlationId,
    });
    await this.dispatcher?.dispatch({
      id: this.idGenerator?.() ?? `event-${startedAt}-cycle`,
      type: "CycleAdvanced",
      playerId: command.playerId,
      occurredAt: command.cycleDate ?? new Date(startedAt),
      metadata: {
        correlationId,
        source: "game-loop",
        version: 1,
      },
      payload: {
        cycleId: correlationId,
        playerId: command.playerId,
        previousCycle:
          command.cycleIndex === undefined ? undefined : command.cycleIndex - 1,
        currentCycle: command.cycleIndex,
      },
    });

    this.logger?.info("Market cycle flow completed", {
      module: "game_loop",
      action: "advance_cycle_flow_completed",
      correlationId,
      context: {
        playerId: command.playerId,
        durationMs: Date.now() - startedAt,
        refreshedAssetCount: refreshedAssets.length,
        gameEventCount: gameLoop.events.length,
      },
    });

    return {
      cycle: {
        playerId: command.playerId,
        cycleDate: command.cycleDate,
        cycleIndex: command.cycleIndex,
      },
      refreshedAssets,
      gameLoop,
      impactSummary: {
        refreshedAssetCount: refreshedAssets.length,
        generatedEventCount: gameLoop.events.length,
      },
    };
  }
}
