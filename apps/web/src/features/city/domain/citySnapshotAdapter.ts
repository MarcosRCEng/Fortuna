import type { PlayerOverview } from "../../../services/types.js";
import type {
  CityAssetClassDistribution,
  CityFinancialSnapshot,
  CityRiskLevel,
} from "./cityTypes.js";

function percentage(valueCents: number, totalCents: number): number {
  if (totalCents <= 0) {
    return 0;
  }

  return Math.round((valueCents * 100) / totalCents);
}

export function createCitySnapshotFromOverview(
  overview: PlayerOverview,
): CityFinancialSnapshot {
  const investedCents = overview.wallet.investedValueCents;
  const totalNetWorthCents = overview.wallet.totalEquityCents;
  const totals = overview.wallet.positions.reduce(
    (accumulator, position) => {
      if (position.assetClass === "FIXED_INCOME") {
        accumulator.fixedIncomeCents += position.marketValueCents;
      }
      if (position.assetClass === "FII") {
        accumulator.realEstateCents += position.marketValueCents;
      }
      if (position.assetClass === "STOCK") {
        accumulator.stocksCents += position.marketValueCents;
      }

      return accumulator;
    },
    {
      fixedIncomeCents: 0,
      realEstateCents: 0,
      stocksCents: 0,
    },
  );

  const distribution: CityAssetClassDistribution = {
    cashPercent: percentage(overview.wallet.availableBalanceCents, totalNetWorthCents),
    fixedIncomePercent: percentage(totals.fixedIncomeCents, totalNetWorthCents),
    realEstatePercent: percentage(totals.realEstateCents, totalNetWorthCents),
    stocksPercent: percentage(totals.stocksCents, totalNetWorthCents),
  };

  const completedMissions = overview.missions.filter(
    (mission) => mission.status === "COMPLETED",
  ).length;
  const availableMissions = overview.missions.filter(
    (mission) => mission.status === "AVAILABLE",
  ).length;
  const hasHighRiskPosition = overview.wallet.positions.some((position) => {
    const asset = overview.assets.find((candidate) => candidate.symbol === position.symbol);
    return asset?.riskLevel === "HIGH" || asset?.riskLevel === "MEDIUM_HIGH";
  });
  const classCount = [
    distribution.cashPercent > 0,
    distribution.fixedIncomePercent > 0,
    distribution.realEstatePercent > 0,
    distribution.stocksPercent > 0,
  ].filter(Boolean).length;
  const riskLevel: CityRiskLevel =
    hasHighRiskPosition && distribution.stocksPercent >= 45
      ? "high"
      : hasHighRiskPosition || classCount < 3
        ? "medium"
        : "low";

  return {
    cashBalanceCents: overview.wallet.availableBalanceCents,
    totalNetWorthCents,
    assetCount: overview.wallet.positionCount,
    assetClassDistribution: distribution,
    accumulatedYieldCents: overview.incomes.reduce(
      (sum, income) => sum + income.amountCents,
      0,
    ),
    completedMissions,
    financialMaturityLevel: Math.max(overview.city.level, completedMissions),
    riskLevel,
    hasYieldToCollect: overview.incomes.some((income) => income.status === "AVAILABLE"),
    availableMissions,
  };
}
