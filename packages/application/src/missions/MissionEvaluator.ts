import { AssetType, type GameEvent, type Mission } from "@fortuna/domain";
import type { GameplayPortfolioSnapshot } from "../gameplay/GameplaySnapshots.js";
import type { PlayerProgress } from "../gameplay/PlayerProgress.js";
import { MAX_RECOMMENDED_ASSET_CONCENTRATION_BASIS_POINTS } from "./MissionCatalog.js";

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
      case "mission-first-investment":
        return this.eventProgress(context.events, "ASSET_PURCHASED");
      case "mission-liquidity-reserve":
        return this.eventProgress(context.events, "ASSET_PURCHASED", {
          assetType: AssetType.FIXED_INCOME,
          liquidity: "DAILY",
        });
      case "mission-initial-diversification":
        return {
          current: Math.min(this.positiveAssetClassCount(context), 2),
          target: 2,
          unit: "COUNT",
        };
      case "mission-first-income-collected":
        return this.eventProgress(context.events, "INCOME_COLLECTED", {
          minimumAmountCents: 1,
        });
      case "mission-high-risk-viewed":
        return this.eventProgress(context.events, "RISK_EDUCATION_VIEWED");
      case "mission-concentration-alert":
        return this.eventProgress(
          [
            ...context.events,
            ...(this.hasConcentrationAboveLimit(context)
              ? [
                  {
                    id: "calculated-concentration-alert",
                    playerId: context.playerId,
                    type: "CONCENTRATION_ALERT_TRIGGERED" as const,
                    occurredAt: new Date(0),
                    source: "GAMEPLAY" as const,
                  },
                ]
              : []),
          ],
          "CONCENTRATION_ALERT_TRIGGERED",
        );
      default:
        return mission.progress;
    }
  }

  private eventProgress(
    events: GameEvent[],
    eventType: GameEvent["type"],
    filter?: {
      assetType?: AssetType;
      minimumAmountCents?: number;
      liquidity?: string;
    },
  ): Mission["progress"] {
    const matched = events.some((event) => {
      if (event.type !== eventType) {
        return false;
      }

      if (filter?.assetType && event.metadata?.assetType !== filter.assetType) {
        return false;
      }

      if (filter?.liquidity && event.metadata?.liquidity !== filter.liquidity) {
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

    for (const allocation of portfolio.allocation) {
      if (allocation.assetType !== AssetType.CASH && allocation.value.cents > 0) {
        classes.add(allocation.assetType);
      }
    }

    return classes.size;
  }

  private hasConcentrationAboveLimit(context: MissionEvaluationContext): boolean {
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

    return maximum > MAX_RECOMMENDED_ASSET_CONCENTRATION_BASIS_POINTS;
  }
}
