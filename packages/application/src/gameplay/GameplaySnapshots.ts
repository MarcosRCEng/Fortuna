import type {
  AllocationValue,
  FinancialEvent,
  GameEvent,
} from "@fortuna/domain";
import type { WalletSummary } from "../use-cases/GetWalletSummaryUseCase.js";
import type { PlayerProgress } from "./PlayerProgress.js";

export interface GameplayPortfolioSnapshot {
  wallet: WalletSummary;
  allocation: AllocationValue[];
  pendingIncomeCount?: number;
  emergencyReserveTargetCents?: number;
}

export interface GameLoopCommand {
  playerId: string;
  financialEvents?: FinancialEvent[];
  gameplayEvents?: GameEvent[];
  portfolio?: GameplayPortfolioSnapshot;
  missionId?: string;
  advanceMarketCycle?: boolean;
  marketPricesRefreshed?: {
    updatedAssetCount: number;
  };
  correlationId?: string;
}

export interface MentorFeedback {
  code: string;
  title: string;
  message: string;
  severity: "info" | "positive" | "warning";
  relatedEventType?: GameEvent["type"];
}

export interface CityEvolutionState {
  playerId: string;
  level: number;
  cityLevel: number;
  skylineTier: "FOUNDATION" | "GROWING" | "DIVERSIFIED" | "MATURE";
  unlockedDistricts: string[];
  unlockedBuildings: string[];
  visualMilestones: string[];
  visualSignals: string[];
  lastUpdatedAt: Date;
}

export interface GameLoopResult {
  events: GameEvent[];
  progress: PlayerProgress;
  city: CityEvolutionState;
  mentorFeedback: MentorFeedback[];
}
