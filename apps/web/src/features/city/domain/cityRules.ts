import type {
  CityDistrict,
  CityFinancialSnapshot,
  CityVisualState,
} from "./cityTypes.js";

const NET_WORTH_LEVELS = [0, 10_000, 50_000, 100_000, 250_000, 500_000];

export function resolveCityLevel(snapshot: CityFinancialSnapshot): number {
  const netWorthLevel = NET_WORTH_LEVELS.reduce(
    (level, threshold, index) =>
      snapshot.totalNetWorthCents >= threshold ? index : level,
    0,
  );
  const educationLevel = Math.min(2, snapshot.completedMissions);
  const maturityBonus = snapshot.financialMaturityLevel >= 4 ? 1 : 0;

  return Math.min(5, Math.max(netWorthLevel, educationLevel) + maturityBonus);
}

export function resolveMaturityLabel(level: number): string {
  if (level >= 5) {
    return "Planejamento maduro";
  }

  if (level >= 3) {
    return "Carteira em organizacao";
  }

  if (level >= 1) {
    return "Base em formacao";
  }

  return "Inicio da jornada";
}

export function isPortfolioConcentrated(
  snapshot: CityFinancialSnapshot,
): boolean {
  const distribution = snapshot.assetClassDistribution;
  return Math.max(
    distribution.cashPercent,
    distribution.fixedIncomePercent,
    distribution.realEstatePercent,
    distribution.stocksPercent,
  ) >= 75;
}

export function resolveDistrictState(
  district: CityDistrict,
  snapshot: CityFinancialSnapshot,
): CityVisualState {
  if (!district.unlocked) {
    return "locked";
  }

  if (snapshot.riskLevel === "high" && district.type === "mentor") {
    return "educational_alert";
  }

  if (isPortfolioConcentrated(snapshot) && district.type === "education") {
    return "educational_alert";
  }

  if (
    snapshot.hasYieldToCollect &&
    (district.type === "fixed_income" || district.type === "real_estate")
  ) {
    return "yield_available";
  }

  if (
    (snapshot.availableMissions ?? 0) > 0 &&
    (district.type === "education" || district.type === "mentor")
  ) {
    return "mission_available";
  }

  if (district.type === "education" && snapshot.completedMissions > 0) {
    return "mission_completed";
  }

  if (district.level >= 2) {
    return "upgraded";
  }

  return "available";
}

export function resolveDistrictLevel(
  districtType: CityDistrict["type"],
  snapshot: CityFinancialSnapshot,
): number {
  if (districtType === "safe_reserve") {
    if (snapshot.cashBalanceCents >= 50_000) {
      return 3;
    }
    return snapshot.cashBalanceCents > 0 ? 1 : 0;
  }

  if (districtType === "fixed_income") {
    return snapshot.assetClassDistribution.fixedIncomePercent > 0
      ? Math.min(3, 1 + Math.floor(snapshot.assetClassDistribution.fixedIncomePercent / 35))
      : 0;
  }

  if (districtType === "stocks") {
    return snapshot.assetClassDistribution.stocksPercent > 0 ? 1 : 0;
  }

  if (districtType === "education") {
    return Math.min(3, 1 + snapshot.completedMissions);
  }

  if (districtType === "mentor") {
    return Math.max(1, Math.min(3, snapshot.financialMaturityLevel));
  }

  if (districtType === "real_estate") {
    return snapshot.assetClassDistribution.realEstatePercent > 0 ? 1 : 0;
  }

  return 0;
}

export function isDistrictUnlocked(
  districtType: CityDistrict["type"],
  snapshot: CityFinancialSnapshot,
): boolean {
  if (districtType === "safe_reserve") {
    return snapshot.cashBalanceCents > 0;
  }

  if (districtType === "fixed_income") {
    return snapshot.assetClassDistribution.fixedIncomePercent > 0;
  }

  if (districtType === "stocks") {
    return snapshot.assetClassDistribution.stocksPercent > 0;
  }

  if (districtType === "education" || districtType === "mentor") {
    return true;
  }

  return false;
}
