import {
  AssetType,
  type FinancialEvent,
  type GameEvent,
  type GameEventMetadata,
  type GameEventType,
} from "@fortuna/domain";
import type { Clock } from "../ports/Clock.js";
import type { GameplayPortfolioSnapshot } from "./GameplaySnapshots.js";
import type { PlayerProgress } from "./PlayerProgress.js";

export interface GameEventServiceContext {
  portfolio?: GameplayPortfolioSnapshot;
  progress: PlayerProgress;
}

const NET_WORTH_MILESTONES_CENTS = [10_000, 100_000, 500_000, 1_000_000];
const EXCESSIVE_CONCENTRATION_BASIS_POINTS = 7_000;

export class GameEventService {
  constructor(
    private readonly clock: Clock,
    private readonly idGenerator: () => string,
  ) {}

  create(
    playerId: string,
    type: GameEventType,
    metadata?: GameEventMetadata,
    source: GameEvent["source"] = "GAMEPLAY",
    correlationId?: string,
  ): GameEvent {
    return {
      id: this.idGenerator(),
      playerId,
      type,
      occurredAt: this.clock.now(),
      source,
      correlationId,
      metadata,
    };
  }

  fromFinancialEvents(
    financialEvents: FinancialEvent[],
    context: GameEventServiceContext,
  ): GameEvent[] {
    const events: GameEvent[] = [];

    for (const financialEvent of financialEvents) {
      if (financialEvent.type === "AssetBought") {
        this.pushOnce(
          events,
          context.progress,
          financialEvent.playerId,
          {
            type: "FIRST_BUY",
            metadata: {
              assetSymbol: financialEvent.asset.symbol.value,
              amountCents: financialEvent.total.cents,
            },
          },
          "FINANCIAL_EVENT",
        );
      }

      if (financialEvent.type === "AssetSold") {
        this.pushOnce(
          events,
          context.progress,
          financialEvent.playerId,
          {
            type: "FIRST_SELL",
            metadata: {
              assetSymbol: financialEvent.asset.symbol.value,
              amountCents: financialEvent.total.cents,
            },
          },
          "FINANCIAL_EVENT",
        );
      }

      if (financialEvent.type === "IncomeCollected") {
        this.pushOnce(
          events,
          context.progress,
          financialEvent.playerId,
          {
            type: "FIRST_INCOME_RECEIVED",
            metadata: {
              assetSymbol: financialEvent.asset.symbol.value,
              amountCents: financialEvent.total.cents,
            },
          },
          "FINANCIAL_EVENT",
        );
      }
    }

    if (financialEvents.length > 0 && context.portfolio) {
      events.push(
        ...this.fromPortfolioSnapshot(financialEvents[0].playerId, context),
      );
    }

    return this.uniqueInBatch(events);
  }

  fromPortfolioSnapshot(
    playerId: string,
    context: GameEventServiceContext,
  ): GameEvent[] {
    const portfolio = context.portfolio;
    if (!portfolio) {
      return [];
    }

    const events: GameEvent[] = [];
    const positionCount = portfolio.wallet.positionCount;
    if (positionCount >= 2) {
      this.pushOnce(events, context.progress, playerId, {
        type: "FIRST_DIVERSIFICATION",
        metadata: { positionCount },
      });
    }

    const reached = NET_WORTH_MILESTONES_CENTS.filter(
      (milestone) =>
        portfolio.wallet.totalEquity.cents >= milestone &&
        !context.progress.netWorthMilestonesReachedCents.includes(milestone),
    );
    for (const milestone of reached) {
      events.push(
        this.create(playerId, "NET_WORTH_REACHED", {
          milestoneCents: milestone,
          totalEquityCents: portfolio.wallet.totalEquity.cents,
        }),
      );
    }

    const maxAllocation = portfolio.allocation.reduce(
      (highest, item) =>
        item.percentageBasisPoints > highest.percentageBasisPoints
          ? item
          : highest,
      {
        assetType: AssetType.CASH,
        value: portfolio.wallet.availableBalance,
        percentageBasisPoints: 0,
      },
    );
    if (
      maxAllocation.percentageBasisPoints >=
      EXCESSIVE_CONCENTRATION_BASIS_POINTS
    ) {
      events.push(
        this.create(playerId, "EXCESSIVE_CONCENTRATION_DETECTED", {
          assetType: maxAllocation.assetType,
          percentageBasisPoints: maxAllocation.percentageBasisPoints,
        }),
      );
    }

    if (
      portfolio.emergencyReserveTargetCents &&
      portfolio.emergencyReserveTargetCents > 0
    ) {
      const cashCents = portfolio.wallet.availableBalance.cents;
      if (cashCents > 0) {
        this.pushOnce(events, context.progress, playerId, {
          type: "EMERGENCY_RESERVE_STARTED",
          metadata: {
            availableBalanceCents: cashCents,
            targetCents: portfolio.emergencyReserveTargetCents,
          },
        });
      }

      if (cashCents >= portfolio.emergencyReserveTargetCents) {
        this.pushOnce(events, context.progress, playerId, {
          type: "EMERGENCY_RESERVE_COMPLETED",
          metadata: {
            availableBalanceCents: cashCents,
            targetCents: portfolio.emergencyReserveTargetCents,
          },
        });
      }
    }

    return this.uniqueInBatch(events);
  }

  private pushOnce(
    events: GameEvent[],
    progress: PlayerProgress,
    playerId: string,
    candidate: { type: GameEventType; metadata?: GameEventMetadata },
    source: GameEvent["source"] = "GAMEPLAY",
  ): void {
    if (progress.seenEventTypes.includes(candidate.type)) {
      return;
    }

    events.push(
      this.create(playerId, candidate.type, candidate.metadata, source),
    );
  }

  private uniqueInBatch(events: GameEvent[]): GameEvent[] {
    const uniqueTypes = new Set<GameEventType>();
    return events.filter((event) => {
      if (
        event.type !== "NET_WORTH_REACHED" &&
        event.type !== "EXCESSIVE_CONCENTRATION_DETECTED" &&
        uniqueTypes.has(event.type)
      ) {
        return false;
      }

      uniqueTypes.add(event.type);
      return true;
    });
  }
}
