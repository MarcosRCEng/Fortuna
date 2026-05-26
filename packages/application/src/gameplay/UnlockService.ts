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
      progress.seenEventTypes.includes("EMERGENCY_RESERVE_STARTED") &&
      !progress.unlockedDistricts.includes("DISTRITO_RESERVA")
    ) {
      events.push(
        createEvent("NEW_DISTRICT_UNLOCKED", {
          playerId,
          districtId: "DISTRITO_RESERVA",
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
      progress.seenEventTypes.includes("EXCESSIVE_CONCENTRATION_DETECTED") &&
      !progress.unlockedTools.includes("CONCENTRATION_ALERT")
    ) {
      events.push(
        createEvent("NEW_TOOL_UNLOCKED", {
          toolId: "CONCENTRATION_ALERT",
        }),
      );
    }

    if (
      progress.completedMissionIds.length >= 2 &&
      progress.marketCyclesAdvanced >= 2 &&
      !progress.unlockedReports.includes("EDUCATIONAL_EVENTS_HISTORY")
    ) {
      events.push(
        createEvent("NEW_TOOL_UNLOCKED", {
          reportId: "EDUCATIONAL_EVENTS_HISTORY",
        }),
      );
    }

    if (
      progress.netWorthMilestonesReachedCents.some(
        (milestone) => milestone >= 100_000,
      ) &&
      progress.seenEventTypes.includes("FIRST_DIVERSIFICATION") &&
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
      progress.unlockedAssetClasses.includes("FII") &&
      !progress.unlockedDistricts.includes("DISTRITO_FIIS")
    ) {
      events.push(
        createEvent("NEW_DISTRICT_UNLOCKED", {
          playerId,
          districtId: "DISTRITO_FIIS",
        }),
      );
    }

    if (
      progress.seenEventTypes.includes("FIRST_BUY") &&
      !progress.grantedBadges.includes("PRIMEIRA_COMPRA_CONSCIENTE")
    ) {
      events.push(
        createEvent("EDUCATIONAL_BADGE_GRANTED", {
          badgeId: "PRIMEIRA_COMPRA_CONSCIENTE",
        }),
      );
    }

    if (
      progress.seenEventTypes.includes("FIRST_DIVERSIFICATION") &&
      !progress.grantedBadges.includes("CARTEIRA_DIVERSIFICADA")
    ) {
      events.push(
        createEvent("EDUCATIONAL_BADGE_GRANTED", {
          badgeId: "CARTEIRA_DIVERSIFICADA",
        }),
      );
    }

    if (
      progress.seenEventTypes.includes("FIRST_INCOME_RECEIVED") &&
      !progress.grantedBadges.includes("COLHEDOR_RENDIMENTOS")
    ) {
      events.push(
        createEvent("EDUCATIONAL_BADGE_GRANTED", {
          badgeId: "COLHEDOR_RENDIMENTOS",
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
