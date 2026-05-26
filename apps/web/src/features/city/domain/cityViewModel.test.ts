import { describe, expect, it } from "vitest";
import type { CityFinancialSnapshot } from "./cityTypes.js";
import { createCityViewModel } from "./cityViewModel.js";

const emptySnapshot: CityFinancialSnapshot = {
  cashBalanceCents: 0,
  totalNetWorthCents: 0,
  assetCount: 0,
  assetClassDistribution: {
    cashPercent: 0,
    fixedIncomePercent: 0,
    realEstatePercent: 0,
    stocksPercent: 0,
  },
  accumulatedYieldCents: 0,
  completedMissions: 0,
  financialMaturityLevel: 0,
  riskLevel: "low",
  hasYieldToCollect: false,
  availableMissions: 0,
};

describe("city visual view model", () => {
  it("converts financial snapshot into city level", () => {
    const city = createCityViewModel({
      ...emptySnapshot,
      totalNetWorthCents: 120_000,
      completedMissions: 1,
      financialMaturityLevel: 3,
    });

    expect(city.cityLevel).toBe(3);
  });

  it("unlocks districts from asset class distribution", () => {
    const city = createCityViewModel({
      ...emptySnapshot,
      cashBalanceCents: 10_000,
      totalNetWorthCents: 70_000,
      assetClassDistribution: {
        cashPercent: 14,
        fixedIncomePercent: 43,
        realEstatePercent: 0,
        stocksPercent: 43,
      },
    });

    expect(city.districts.find((district) => district.type === "safe_reserve")?.unlocked).toBe(true);
    expect(city.districts.find((district) => district.type === "fixed_income")?.unlocked).toBe(true);
    expect(city.districts.find((district) => district.type === "stocks")?.unlocked).toBe(true);
    expect(city.districts.find((district) => district.type === "real_estate")?.unlocked).toBe(false);
  });

  it("shows an educational alert for high risk", () => {
    const city = createCityViewModel({
      ...emptySnapshot,
      riskLevel: "high",
      totalNetWorthCents: 80_000,
    });

    expect(city.alerts.join(" ")).toContain("risco elevado");
    expect(city.districts.find((district) => district.type === "mentor")?.state).toBe(
      "educational_alert",
    );
  });

  it("shows yield available without jackpot-style state", () => {
    const city = createCityViewModel({
      ...emptySnapshot,
      hasYieldToCollect: true,
      assetClassDistribution: {
        cashPercent: 20,
        fixedIncomePercent: 80,
        realEstatePercent: 0,
        stocksPercent: 0,
      },
    });

    expect(city.hasYieldToCollect).toBe(true);
    expect(city.highlights.join(" ")).toContain("rendimentos disponiveis");
    expect(city.districts.find((district) => district.type === "fixed_income")?.state).toBe(
      "yield_available",
    );
  });

  it("upgrades the academy when missions are completed", () => {
    const city = createCityViewModel({
      ...emptySnapshot,
      completedMissions: 2,
      financialMaturityLevel: 2,
    });
    const academy = city.districts.find((district) => district.type === "education");

    expect(academy?.level).toBe(3);
    expect(academy?.state).toBe("mission_completed");
  });

  it("does not mutate the original financial snapshot", () => {
    const snapshot = {
      ...emptySnapshot,
      cashBalanceCents: 10_000,
      assetClassDistribution: { ...emptySnapshot.assetClassDistribution },
    };
    const before = structuredClone(snapshot);

    createCityViewModel(snapshot);

    expect(snapshot).toEqual(before);
  });

  it("handles an empty initial snapshot", () => {
    const city = createCityViewModel(emptySnapshot);

    expect(city.cityLevel).toBe(0);
    expect(city.districts.find((district) => district.type === "safe_reserve")?.state).toBe(
      "locked",
    );
    expect(city.alerts.join(" ")).toContain("reserva");
  });

  it("represents a diversified portfolio without concentration alert", () => {
    const city = createCityViewModel({
      ...emptySnapshot,
      cashBalanceCents: 25_000,
      totalNetWorthCents: 100_000,
      assetCount: 4,
      assetClassDistribution: {
        cashPercent: 25,
        fixedIncomePercent: 25,
        realEstatePercent: 25,
        stocksPercent: 25,
      },
      riskLevel: "low",
    });

    expect(city.alerts.some((alert) => alert.includes("concentrada"))).toBe(false);
    expect(city.unlockedDistrictCount).toBeGreaterThanOrEqual(5);
  });
});
