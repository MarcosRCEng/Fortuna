import type { Cents } from "../../../financial/money.js";

export type CityDistrictType =
  | "safe_reserve"
  | "fixed_income"
  | "real_estate"
  | "stocks"
  | "education"
  | "mentor"
  | "market"
  | "reports";

export type CityVisualState =
  | "locked"
  | "available"
  | "upgrading"
  | "upgraded"
  | "educational_alert"
  | "yield_available"
  | "mission_available"
  | "mission_completed";

export type CityRiskLevel = "low" | "medium" | "high";

export interface CityPosition {
  x: number;
  y: number;
}

export interface CityBuilding {
  id: string;
  name: string;
  districtType: CityDistrictType;
  level: number;
  state: CityVisualState;
  icon?: string;
}

export interface CityDistrict {
  id: string;
  type: CityDistrictType;
  name: string;
  description: string;
  level: number;
  state: CityVisualState;
  unlocked: boolean;
  position: CityPosition;
  buildings: CityBuilding[];
  mentorHint?: string;
}

export interface CityAssetClassDistribution {
  cashPercent: number;
  fixedIncomePercent: number;
  realEstatePercent: number;
  stocksPercent: number;
}

export interface CityFinancialSnapshot {
  cashBalanceCents: Cents;
  totalNetWorthCents: Cents;
  assetCount: number;
  assetClassDistribution: CityAssetClassDistribution;
  accumulatedYieldCents: Cents;
  completedMissions: number;
  financialMaturityLevel: number;
  riskLevel: CityRiskLevel;
  hasYieldToCollect: boolean;
  availableMissions?: number;
}

export interface CityViewModel {
  cityLevel: number;
  maturityLabel: string;
  districts: CityDistrict[];
  alerts: string[];
  highlights: string[];
  totalNetWorthCents: Cents;
  unlockedDistrictCount: number;
  hasYieldToCollect: boolean;
  mentorMessage: string;
}
