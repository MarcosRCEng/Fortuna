import type { GameEvent, GameEventType } from "@fortuna/domain";
import type { Clock } from "../ports/Clock.js";
import { FINANCIAL_MATURITY_LEVELS } from "./GameDesignCatalog.js";
import type { PlayerProgress } from "./PlayerProgress.js";

const EXPERIENCE_BY_EVENT: Record<GameEventType, number> = {
  FIRST_BUY: 100,
  FIRST_SELL: 80,
  FIRST_INCOME_RECEIVED: 120,
  FIRST_DIVERSIFICATION: 180,
  NET_WORTH_REACHED: 150,
  MISSION_COMPLETED: 200,
  EMERGENCY_RESERVE_STARTED: 120,
  EMERGENCY_RESERVE_COMPLETED: 300,
  EXCESSIVE_CONCENTRATION_DETECTED: 40,
  NEW_DISTRICT_UNLOCKED: 50,
  NEW_ASSET_CLASS_UNLOCKED: 50,
  NEW_TOOL_UNLOCKED: 50,
  MARKET_CYCLE_ADVANCED: 30,
  PLAYER_LEVEL_UP: 0,
  EDUCATIONAL_BADGE_GRANTED: 75,
  MISSION_REWARD_CLAIMED: 50,
  PLAYER_CREATED: 0,
  ASSET_PURCHASED: 0,
  ASSET_SOLD: 0,
  INCOME_COLLECTED: 0,
  PORTFOLIO_UPDATED: 0,
  MENTOR_TIP_READ: 25,
  TRANSACTION_HISTORY_VIEWED: 25,
  CITY_DISTRICT_UNLOCKED: 0,
  REPORT_VIEWED: 25,
};

export class ProgressionService {
  constructor(private readonly clock: Clock) {}

  applyEvents(progress: PlayerProgress, events: GameEvent[]): PlayerProgress {
    const next: PlayerProgress = {
      ...progress,
      completedMissionIds: [...progress.completedMissionIds],
      rewardedMissionIds: [...(progress.rewardedMissionIds ?? [])],
      grantedBadges: [...progress.grantedBadges],
      unlockedDistricts: [...progress.unlockedDistricts],
      unlockedAssetClasses: [...progress.unlockedAssetClasses],
      unlockedTools: [...progress.unlockedTools],
      unlockedReports: [...progress.unlockedReports],
      seenEventTypes: [...progress.seenEventTypes],
      netWorthMilestonesReachedCents: [
        ...progress.netWorthMilestonesReachedCents,
      ],
      updatedAt: this.clock.now(),
    };

    for (const event of events) {
      next.experiencePoints += EXPERIENCE_BY_EVENT[event.type];
      this.markSeen(next, event.type);

      if (event.type === "MISSION_COMPLETED" && event.metadata?.missionId) {
        this.addUnique(
          next.completedMissionIds,
          String(event.metadata.missionId),
        );
      }

      if (
        event.type === "MISSION_REWARD_CLAIMED" &&
        event.metadata?.missionId
      ) {
        this.addUnique(
          next.rewardedMissionIds,
          String(event.metadata.missionId),
        );
      }

      if (
        event.type === "EDUCATIONAL_BADGE_GRANTED" &&
        event.metadata?.badgeId
      ) {
        this.addUnique(next.grantedBadges, String(event.metadata.badgeId));
      }

      if (
        event.type === "NEW_DISTRICT_UNLOCKED" &&
        event.metadata?.districtId
      ) {
        this.addUnique(
          next.unlockedDistricts,
          String(event.metadata.districtId),
        );
      }

      if (
        event.type === "NEW_ASSET_CLASS_UNLOCKED" &&
        event.metadata?.assetClass
      ) {
        this.addUnique(
          next.unlockedAssetClasses,
          String(event.metadata.assetClass),
        );
      }

      if (event.type === "NEW_TOOL_UNLOCKED" && event.metadata?.toolId) {
        this.addUnique(next.unlockedTools, String(event.metadata.toolId));
      }

      if (event.type === "NEW_TOOL_UNLOCKED" && event.metadata?.reportId) {
        this.addUnique(next.unlockedReports, String(event.metadata.reportId));
      }

      if (
        event.type === "NET_WORTH_REACHED" &&
        typeof event.metadata?.milestoneCents === "number"
      ) {
        this.addUniqueNumber(
          next.netWorthMilestonesReachedCents,
          event.metadata.milestoneCents,
        );
      }

      if (event.type === "MARKET_CYCLE_ADVANCED") {
        next.marketCyclesAdvanced += 1;
      }
    }

    next.level = Math.max(progress.level, this.evaluateMaturityLevel(next));

    return next;
  }

  createLevelUpEvents(
    playerId: string,
    before: PlayerProgress,
    after: PlayerProgress,
    createEvent: (
      type: GameEventType,
      metadata?: Record<string, string | number | boolean>,
    ) => GameEvent,
  ): GameEvent[] {
    const events: GameEvent[] = [];
    for (let level = before.level + 1; level <= after.level; level += 1) {
      events.push(createEvent("PLAYER_LEVEL_UP", { level }));
    }

    return events;
  }

  private markSeen(progress: PlayerProgress, type: GameEventType): void {
    this.addUnique(progress.seenEventTypes, type);
  }

  private addUnique(values: string[], value: string): void {
    if (!values.includes(value)) {
      values.push(value);
    }
  }

  private addUniqueNumber(values: number[], value: number): void {
    if (!values.includes(value)) {
      values.push(value);
    }
  }

  private evaluateMaturityLevel(progress: PlayerProgress): number {
    let reachedLevel = 1;

    for (const level of FINANCIAL_MATURITY_LEVELS) {
      if (level.level === reachedLevel + 1 && level.isReached(progress)) {
        reachedLevel = level.level;
      }
    }

    return reachedLevel;
  }
}
