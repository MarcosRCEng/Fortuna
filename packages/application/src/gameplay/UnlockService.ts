import type { GameEvent, GameEventType } from "@fortuna/domain";
import type { PlayerProgress } from "./PlayerProgress.js";

export class UnlockService {
  evaluate(
    playerId: string,
    progress: PlayerProgress,
    createEvent: (
      type: GameEventType,
      metadata?: Record<string, string | number | boolean>,
    ) => GameEvent,
  ): GameEvent[] {
    const events: GameEvent[] = [];

    if (
      progress.seenEventTypes.includes("FIRST_BUY") &&
      !progress.unlockedDistricts.includes("DISTRITO_INVESTIMENTOS")
    ) {
      events.push(
        createEvent("NEW_DISTRICT_UNLOCKED", {
          playerId,
          districtId: "DISTRITO_INVESTIMENTOS",
        }),
      );
    }

    if (
      progress.seenEventTypes.includes("FIRST_DIVERSIFICATION") &&
      !progress.unlockedTools.includes("ALLOCATION_REPORT")
    ) {
      events.push(
        createEvent("NEW_TOOL_UNLOCKED", {
          toolId: "ALLOCATION_REPORT",
        }),
      );
    }

    if (
      progress.netWorthMilestonesReachedCents.some(
        (milestone) => milestone >= 100_000,
      ) &&
      !progress.unlockedAssetClasses.includes("FII")
    ) {
      events.push(
        createEvent("NEW_ASSET_CLASS_UNLOCKED", {
          assetClass: "FII",
          reason: "NET_WORTH_REACHED",
        }),
      );
    }

    if (
      progress.seenEventTypes.includes("EMERGENCY_RESERVE_COMPLETED") &&
      !progress.grantedBadges.includes("RESERVA_CONCLUIDA")
    ) {
      events.push(
        createEvent("EDUCATIONAL_BADGE_GRANTED", {
          badgeId: "RESERVA_CONCLUIDA",
        }),
      );
    }

    return events;
  }
}
