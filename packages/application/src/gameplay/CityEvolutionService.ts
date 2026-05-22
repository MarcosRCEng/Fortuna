import type { CityEvolutionState } from "./GameplaySnapshots.js";
import type { PlayerProgress } from "./PlayerProgress.js";

export class CityEvolutionService {
  describe(progress: PlayerProgress): CityEvolutionState {
    return {
      playerId: progress.playerId,
      level: progress.level,
      cityLevel: this.cityLevel(progress),
      skylineTier: this.skylineTier(progress),
      unlockedDistricts: [...progress.unlockedDistricts],
      unlockedBuildings: this.unlockedBuildings(progress),
      visualMilestones: this.visualMilestones(progress),
      visualSignals: this.visualSignals(progress),
      lastUpdatedAt: progress.updatedAt,
    };
  }

  private skylineTier(
    progress: PlayerProgress,
  ): CityEvolutionState["skylineTier"] {
    if (progress.level >= 8) {
      return "MATURE";
    }

    if (progress.seenEventTypes.includes("FIRST_DIVERSIFICATION")) {
      return "DIVERSIFIED";
    }

    if (progress.level >= 3 || progress.seenEventTypes.includes("FIRST_BUY")) {
      return "GROWING";
    }

    return "FOUNDATION";
  }

  private cityLevel(progress: PlayerProgress): number {
    if (
      progress.seenEventTypes.includes("EMERGENCY_RESERVE_COMPLETED") &&
      progress.unlockedTools.includes("ALLOCATION_REPORT")
    ) {
      return 5;
    }

    if (
      progress.seenEventTypes.includes("FIRST_DIVERSIFICATION") &&
      progress.seenEventTypes.includes("FIRST_INCOME_RECEIVED")
    ) {
      return 4;
    }

    if (
      progress.seenEventTypes.includes("EMERGENCY_RESERVE_STARTED") &&
      progress.unlockedAssetClasses.length >= 2
    ) {
      return 3;
    }

    if (
      progress.seenEventTypes.includes("FIRST_BUY") &&
      progress.completedMissionIds.length >= 1
    ) {
      return 2;
    }

    return 1;
  }

  private unlockedBuildings(progress: PlayerProgress): string[] {
    const buildings = ["CITY_HALL"];

    if (progress.seenEventTypes.includes("FIRST_BUY")) {
      buildings.push("BROKERAGE_SCHOOL");
    }

    if (progress.seenEventTypes.includes("EMERGENCY_RESERVE_STARTED")) {
      buildings.push("RESERVE_FOUNDATION");
    }

    if (progress.unlockedTools.includes("ALLOCATION_REPORT")) {
      buildings.push("ANALYTICS_CENTER");
    }

    if (progress.seenEventTypes.includes("FIRST_INCOME_RECEIVED")) {
      buildings.push("INCOME_PARK");
    }

    return buildings;
  }

  private visualMilestones(progress: PlayerProgress): string[] {
    const milestones: string[] = [];

    if (progress.completedMissionIds.length > 0) {
      milestones.push("FIRST_EDUCATIONAL_MISSION");
    }

    if (progress.marketCyclesAdvanced >= 2) {
      milestones.push("MARKET_ROUTINE_STARTED");
    }

    if (progress.grantedBadges.length > 0) {
      milestones.push("EDUCATIONAL_BADGES_VISIBLE");
    }

    return milestones;
  }

  private visualSignals(progress: PlayerProgress): string[] {
    const signals = ["CITY_HALL_ACTIVE"];

    if (progress.seenEventTypes.includes("FIRST_BUY")) {
      signals.push("BROKERAGE_LIGHTS_ON");
    }

    if (progress.seenEventTypes.includes("FIRST_INCOME_RECEIVED")) {
      signals.push("INCOME_PARK_FLOWING");
    }

    if (progress.seenEventTypes.includes("EMERGENCY_RESERVE_COMPLETED")) {
      signals.push("RESERVE_TOWER_STABLE");
    }

    return signals;
  }
}
