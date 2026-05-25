export type CityBuildingType =
  | "financial_hall"
  | "reserve_bank"
  | "city_exchange"
  | "real_estate_center"
  | "financial_school"
  | "income_park"
  | "mentor_tower";

export type CityBuildingStatus = "locked" | "started" | "growing" | "strong";

export interface CityBuildingViewModel {
  id: CityBuildingType;
  name: string;
  description: string;
  educationalMessage: string;
  icon: string;
  level: number;
  maxLevel: number;
  progressPercent: number;
  nextLevelHint: string;
  reason: string;
  status: CityBuildingStatus;
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
