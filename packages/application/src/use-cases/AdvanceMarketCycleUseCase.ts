import type { Asset } from "../ports/MarketDataProvider.js";
import type { MarketDataProvider } from "../ports/MarketDataProvider.js";
import type { GameLoopService } from "../gameplay/GameLoopService.js";
import type { GameLoopResult } from "../gameplay/GameplaySnapshots.js";

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
  ) {}

  async execute(
    command: AdvanceMarketCycleCommand,
  ): Promise<AdvanceMarketCycleResult> {
    const refreshedAssets = await this.marketData.refreshPrices({
      asOf: command.cycleDate,
    });
    const gameLoop = await this.gameLoop.handle({
      playerId: command.playerId,
      advanceMarketCycle: true,
      correlationId: command.cycleIndex
        ? `market-cycle-${command.cycleIndex}`
        : undefined,
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
