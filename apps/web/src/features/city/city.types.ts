export type CityBuildingType =
  | "financial_hall"
  | "reserve_bank"
  | "city_exchange"
  | "real_estate_center"
  | "financial_school"
  | "income_park"
  | "mentor_tower";

export type CityBuildingStatus = "locked" | "started" | "growing" | "strong";

export type CityBuildingUnlockRule =
  | "always"
  | "has_cash"
  | "has_variable_income"
  | "has_real_estate"
  | "has_completed_mission"
  | "has_income";

export type CityBuildingStageRule =
  | "general_maturity"
  | "reserve_security"
  | "variable_income"
  | "real_estate_income"
  | "education_progress"
  | "passive_income"
  | "mentor_guidance";

export interface CityBuildingViewModel {
  id: CityBuildingType;
  name: string;
  shortLabel: string;
  district: string;
  description: string;
  purpose: string;
  educationalMessage: string;
  icon: string;
  level: number;
  maxLevel: number;
  progressPercent: number;
  nextLevelHint: string;
  nextAction: string;
  reason: string;
  status: CityBuildingStatus;
  route?: string;
  assetPrefix: string;
  position: { tileX: number; tileY: number };
  visualPriority: number;
  hasAction: boolean;
  actionLabel?: string;
  alertLabel?: string;
}

export interface DeriveCityInput {
  totalEquityCents: number;
  availableBalanceCents: number;
  allocationByClass: Array<{
    assetClass: string;
    percentage: number;
    valueCents: number;
  }>;
  positionsCount: number;
  completedMissionsCount: number;
  totalMissionsCount: number;
  collectedIncomeCents: number;
  collectibleIncomeCents: number;
  mentorMessagesCount: number;
  hasConcentrationWarning: boolean;
  largestPositionPercentage: number;
}
