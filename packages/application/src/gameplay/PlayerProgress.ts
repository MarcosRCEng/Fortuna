import type { GameEventType } from "@fortuna/domain";

export interface PlayerProgress {
  playerId: string;
  level: number;
  experiencePoints: number;
  completedMissionIds: string[];
  grantedBadges: string[];
  unlockedDistricts: string[];
  unlockedAssetClasses: string[];
  unlockedTools: string[];
  unlockedReports: string[];
  seenEventTypes: GameEventType[];
  netWorthMilestonesReachedCents: number[];
  marketCyclesAdvanced: number;
  updatedAt: Date;
}

export function createInitialPlayerProgress(
  playerId: string,
  now: Date,
): PlayerProgress {
  return {
    playerId,
    level: 1,
    experiencePoints: 0,
    completedMissionIds: [],
    grantedBadges: [],
    unlockedDistricts: ["CENTRO_FINANCEIRO"],
    unlockedAssetClasses: ["CASH"],
    unlockedTools: ["WALLET_SUMMARY"],
    unlockedReports: [],
    seenEventTypes: [],
    netWorthMilestonesReachedCents: [],
    marketCyclesAdvanced: 0,
    updatedAt: now,
  };
}
