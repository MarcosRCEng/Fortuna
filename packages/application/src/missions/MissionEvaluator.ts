import { AssetType, type GameEvent, type Mission } from "@fortuna/domain";
import type { GameplayPortfolioSnapshot } from "../gameplay/GameplaySnapshots.js";
import type { PlayerProgress } from "../gameplay/PlayerProgress.js";
import {
  CONCENTRATION_MAXIMUM_BASIS_POINTS,
  EMERGENCY_RESERVE_MINIMUM_CENTS,
  SAFETY_CASH_MINIMUM_BASIS_POINTS,
} from "./MissionCatalog.js";

export interface MissionEvaluationContext {
  playerId: string;
  events: GameEvent[];
  progress: PlayerProgress;
  portfolio?: GameplayPortfolioSnapshot;
}

export interface MissionEvaluationResult {
  mission: Mission;
  completedNow: boolean;
}

export class MissionEvaluator {
  evaluate(
    mission: Mission,
    context: MissionEvaluationContext,
  ): MissionEvaluationResult {
    const progress = this.calculateProgress(mission, context);
    const alreadyCompleted = context.progress.completedMissionIds.includes(
      mission.id,
    );
    const alreadyRewarded = (
      context.progress.rewardedMissionIds ?? []
    ).includes(mission.id);
    const completed = progress.current >= progress.target;

    return {
      mission: {
        ...mission,
        status: alreadyRewarded
          ? "REWARDED"
          : alreadyCompleted || completed
            ? "COMPLETED"
            : progress.current > 0
              ? "IN_PROGRESS"
              : mission.status,
        progress,
      },
      completedNow: completed && !alreadyCompleted && !alreadyRewarded,
    };
  }

  private calculateProgress(
    mission: Mission,
    context: MissionEvaluationContext,
  ): Mission["progress"] {
    switch (mission.id) {
      case "initial-reserve":
        return {
          current: Math.min(
            context.portfolio?.wallet.availableBalance.cents ?? 0,
            EMERGENCY_RESERVE_MINIMUM_CENTS,
          ),
          target: EMERGENCY_RESERVE_MINIMUM_CENTS,
          unit: "CENTS",
        };
      case "first-fixed-income":
        return this.eventProgress(context.events, "ASSET_PURCHASED", {
          assetType: AssetType.FIXED_INCOME,
        });
      case "first-income":
        return this.eventProgress(context.events, "INCOME_COLLECTED", {
          minimumAmountCents: 1,
        });
      case "first-reit":
        return this.eventProgress(context.events, "ASSET_PURCHASED", {
          assetType: AssetType.FII,
        });
      case "diversify-three-classes":
        return {
          current: Math.min(this.positiveAssetClassCount(context), 3),
          target: 3,
          unit: "COUNT",
        };
      case "keep-safety-cash":
        return {
          current: Math.min(
            this.cashPercentageBasisPoints(context),
            SAFETY_CASH_MINIMUM_BASIS_POINTS,
          ),
          target: SAFETY_CASH_MINIMUM_BASIS_POINTS,
          unit: "BASIS_POINTS",
        };
      case "view-transaction-history":
        return this.eventProgress(context.events, "TRANSACTION_HISTORY_VIEWED");
      case "read-mentor-tip":
        return this.eventProgress(context.events, "MENTOR_TIP_READ");
      case "reduce-concentration":
        return {
          current: this.isConcentrationBelowLimit(context) ? 1 : 0,
          target: 1,
          unit: "COUNT",
        };
      default:
        return mission.progress;
    }
  }

  private eventProgress(
    events: GameEvent[],
    eventType: GameEvent["type"],
    filter?: { assetType?: AssetType; minimumAmountCents?: number },
  ): Mission["progress"] {
    const matched = events.some((event) => {
      if (event.type !== eventType) {
        return false;
      }

      if (filter?.assetType && event.metadata?.assetType !== filter.assetType) {
        return false;
      }

      if (
        filter?.minimumAmountCents !== undefined &&
        (typeof event.metadata?.amountCents !== "number" ||
          event.metadata.amountCents < filter.minimumAmountCents)
      ) {
        return false;
      }

      return true;
    });

    return { current: matched ? 1 : 0, target: 1, unit: "COUNT" };
  }

  private positiveAssetClassCount(context: MissionEvaluationContext): number {
    const classes = new Set<AssetType>();
    const portfolio = context.portfolio;
    if (!portfolio) {
      return 0;
    }

    if (portfolio.wallet.availableBalance.cents > 0) {
      classes.add(AssetType.CASH);
    }

    for (const allocation of portfolio.allocation) {
      if (allocation.value.cents > 0) {
        classes.add(allocation.assetType);
      }
    }

    return classes.size;
  }

  private cashPercentageBasisPoints(context: MissionEvaluationContext): number {
    const portfolio = context.portfolio;
    if (!portfolio || portfolio.wallet.totalEquity.cents <= 0) {
      return 0;
    }

    if (
      portfolio.wallet.availableBalance.cents >= EMERGENCY_RESERVE_MINIMUM_CENTS
    ) {
      return SAFETY_CASH_MINIMUM_BASIS_POINTS;
    }

    return Math.floor(
      (portfolio.wallet.availableBalance.cents * 10_000) /
        portfolio.wallet.totalEquity.cents,
    );
  }

  private isConcentrationBelowLimit(
    context: MissionEvaluationContext,
  ): boolean {
    const portfolio = context.portfolio;
    if (!portfolio || portfolio.allocation.length === 0) {
      return false;
    }

    const maximum = portfolio.allocation.reduce(
      (highest, item) =>
        item.percentageBasisPoints > highest
          ? item.percentageBasisPoints
          : highest,
      0,
    );

    return maximum > 0 && maximum <= CONCENTRATION_MAXIMUM_BASIS_POINTS;
  }
}
