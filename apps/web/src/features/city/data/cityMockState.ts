import type { CityFinancialSnapshot } from "../domain/cityTypes.js";

export const cityMockState: CityFinancialSnapshot = {
  cashBalanceCents: 35_000,
  totalNetWorthCents: 80_640,
  assetCount: 3,
  assetClassDistribution: {
    cashPercent: 43,
    fixedIncomePercent: 25,
    realEstatePercent: 25,
    stocksPercent: 7,
  },
  accumulatedYieldCents: 220,
  completedMissions: 1,
  financialMaturityLevel: 2,
  riskLevel: "medium",
  hasYieldToCollect: true,
  availableMissions: 1,
};
