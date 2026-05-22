import type { AssetType } from "../value-objects/AssetType.js";
import type { GameEventType } from "../events/GameEvents.js";

export const MISSION_STATUSES = [
  "LOCKED",
  "AVAILABLE",
  "IN_PROGRESS",
  "COMPLETED",
  "REWARDED",
] as const;

export type MissionStatus = (typeof MISSION_STATUSES)[number];

export const MISSION_TYPES = [
  "FIRST_PURCHASE",
  "FIRST_RESERVE",
  "FIRST_DIVERSIFICATION",
  "FIRST_INCOME",
  "UNDERSTAND_RISK",
  "UNDERSTAND_LIQUIDITY",
  "UNDERSTAND_FIXED_INCOME",
  "UNDERSTAND_REITS",
  "UNDERSTAND_STOCKS",
  "REDUCE_CONCENTRATION",
  "EDUCATIONAL_INTERACTION",
  "TRANSACTION_HISTORY",
] as const;

export type MissionType = (typeof MISSION_TYPES)[number];

export const MISSION_REWARD_TYPES = [
  "UNLOCK_DISTRICT",
  "UNLOCK_ASSET",
  "UNLOCK_BUILDING",
  "UNLOCK_ADVANCED_TIP",
  "EDUCATIONAL_BADGE",
  "UNLOCK_REPORT",
  "CITY_XP",
] as const;

export type MissionRewardType = (typeof MISSION_REWARD_TYPES)[number];

export const MISSION_RULE_TYPES = [
  "EVENT_BASED",
  "PORTFOLIO_STATE_BASED",
  "BEHAVIOR_BASED",
  "EDUCATIONAL_INTERACTION_BASED",
] as const;

export type MissionRuleType = (typeof MISSION_RULE_TYPES)[number];

export interface MissionCompletionRule {
  ruleType: MissionRuleType;
  targetValue?: number;
  targetAssetClass?: AssetType;
  requiredEvent?: GameEventType;
  requiredCount?: number;
}

export interface MissionReward {
  type: MissionRewardType;
  targetId: string;
  label: string;
  cityXp?: number;
}

export interface MissionProgress {
  current: number;
  target: number;
  unit: "COUNT" | "CENTS" | "BASIS_POINTS" | "PERCENTAGE";
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  objective: string;
  educationalExplanation: string;
  cityRelation: string;
  type: MissionType;
  status: MissionStatus;
  completionRule: MissionCompletionRule;
  reward: MissionReward;
  progress: MissionProgress;
  relatedEvents: GameEventType[];
}
