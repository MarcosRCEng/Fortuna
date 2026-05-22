import type { CityEvolutionState } from "./GameplaySnapshots.js";
import type { PlayerProgress } from "./PlayerProgress.js";

export class CityEvolutionService {
  describe(progress: PlayerProgress): CityEvolutionState {
    return {
      playerId: progress.playerId,
      level: progress.level,
      skylineTier: this.skylineTier(progress),
      unlockedDistricts: [...progress.unlockedDistricts],
      visualSignals: this.visualSignals(progress),
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
