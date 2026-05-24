import type { AllocationValue } from "../wallet/Wallet.js";
import type { FinancialEvent } from "../events/FinancialEvents.js";
import type { GameEvent } from "../events/GameEvents.js";
import type { MoneyCents } from "../money/Money.js";
import type { Quantity } from "../value-objects/Quantity.js";
import type { AssetType } from "../value-objects/AssetType.js";
import type {
  MentorEducationalConcept,
  MentorGameLoopMoment,
  MentorMessageSeverity,
  MentorMessageTrigger,
  MentorMessageType,
  MentorTipSeverity,
  MentorTipType,
  MentorTriggerType,
} from "./MentorEnums.js";

export interface MentorPortfolioPosition {
  assetId: string;
  symbol: string;
  name: string;
  assetType: AssetType;
  quantity: Quantity;
  averagePrice: MoneyCents;
  marketValue: MoneyCents;
}

export interface MentorShownTip {
  ruleId: string;
  tipId?: string;
  shownAt: Date;
  occurrences: number;
}

export interface MentorContext {
  playerId: string;
  currentCashInCents: MoneyCents;
  totalEquityInCents: MoneyCents;
  portfolioPositions: MentorPortfolioPosition[];
  assetAllocation: AllocationValue[];
  recentEvents: Array<FinancialEvent | GameEvent>;
  completedMissions: string[];
  activeMissions: string[];
  cityProgress?: {
    level: number;
    cityLevel: number;
    unlockedDistricts: string[];
  };
  alreadyShownTips: MentorShownTip[];
  currentGameLoopMoment: MentorGameLoopMoment;
  emergencyReserveTargetCents?: number;
}

export interface MentorRuleCooldown {
  minutes: number;
}

export interface MentorRule {
  id: string;
  code: string;
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  triggerType: MentorTriggerType;
  conditions: Record<string, string | number | boolean>;
  cooldown?: MentorRuleCooldown;
  maxOccurrences?: number;
  educationalConcepts: MentorEducationalConcept[];
  evaluate(context: MentorContext): boolean;
}

export interface MentorTip {
  id: string;
  ruleId: string;
  type: MentorTipType;
  title: string;
  message: string;
  concept: MentorEducationalConcept;
  severity: MentorTipSeverity;
  actionLabel?: string;
  relatedMissionId?: string;
  relatedAssetId?: string;
  createdAt: Date;
  metadata: Record<string, string | number | boolean>;
}

export interface MentorMessage {
  id: string;
  playerId: string;
  type: MentorMessageType;
  trigger: MentorMessageTrigger;
  title: string;
  message: string;
  educationalConcept?: string;
  severity: MentorMessageSeverity;
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdAt: Date;
  readAt?: Date;
  metadata?: Record<string, string | number | boolean | null>;
}
