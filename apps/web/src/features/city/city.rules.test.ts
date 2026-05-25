import { describe, expect, it } from "vitest";
import { deriveCityBuildings } from "./city.rules.js";
import type { CityBuildingType, DeriveCityInput } from "./city.types.js";

const baseInput: DeriveCityInput = {
  totalEquityCents: 0,
  availableBalanceCents: 0,
  allocationByClass: [],
  positionsCount: 0,
  completedMissionsCount: 0,
  totalMissionsCount: 0,
  collectedIncomeCents: 0,
  collectibleIncomeCents: 0,
  mentorMessagesCount: 0,
  hasConcentrationWarning: false,
  largestPositionPercentage: 0,
};

function building(input: DeriveCityInput, id: CityBuildingType) {
  const result = deriveCityBuildings(input).find((candidate) => candidate.id === id);
  if (!result) {
    throw new Error(`Building ${id} not found`);
  }
  return result;
}

describe("deriveCityBuildings", () => {
  it("returns locked or initial buildings for a new player", () => {
    const buildings = deriveCityBuildings(baseInput);

    expect(buildings).toHaveLength(7);
    expect(buildings.every((item) => item.level === 0)).toBe(true);
    expect(buildings.every((item) => item.status === "locked")).toBe(true);
  });

  it("starts reserve bank when player has only idle balance", () => {
    const reserve = building(
      {
        ...baseInput,
        totalEquityCents: 50_000,
        availableBalanceCents: 50_000,
      },
      "reserve_bank",
    );

    expect(reserve.level).toBeGreaterThan(0);
    expect(reserve.reason).toContain("saldo disponivel");
  });

  it("evolves reserve bank when player has fixed income allocation", () => {
    const reserve = building(
      {
        ...baseInput,
        totalEquityCents: 100_000,
        availableBalanceCents: 15_000,
        allocationByClass: [
          { assetClass: "FIXED_INCOME", percentage: 60, valueCents: 60_000 },
        ],
        positionsCount: 1,
      },
      "reserve_bank",
    );

    expect(reserve.level).toBeGreaterThanOrEqual(4);
    expect(reserve.educationalMessage).toContain("Liquidez");
  });

  it("evolves city exchange when player has stocks", () => {
    const exchange = building(
      {
        ...baseInput,
        totalEquityCents: 120_000,
        allocationByClass: [{ assetClass: "STOCK", percentage: 35, valueCents: 42_000 }],
        positionsCount: 2,
        largestPositionPercentage: 45,
      },
      "city_exchange",
    );

    expect(exchange.level).toBeGreaterThanOrEqual(4);
    expect(exchange.reason).toContain("acoes simuladas");
  });

  it("evolves real estate center when player has FIIs", () => {
    const realEstate = building(
      {
        ...baseInput,
        totalEquityCents: 100_000,
        allocationByClass: [{ assetClass: "FII", percentage: 25, valueCents: 25_000 }],
        collectedIncomeCents: 1_200,
        positionsCount: 1,
      },
      "real_estate_center",
    );

    expect(realEstate.level).toBeGreaterThanOrEqual(4);
    expect(realEstate.description).toContain("setor imobiliario");
  });

  it("rewards diversified progress in the financial hall", () => {
    const hall = building(
      {
        ...baseInput,
        totalEquityCents: 200_000,
        availableBalanceCents: 30_000,
        allocationByClass: [
          { assetClass: "FIXED_INCOME", percentage: 35, valueCents: 70_000 },
          { assetClass: "FII", percentage: 20, valueCents: 40_000 },
          { assetClass: "STOCK", percentage: 30, valueCents: 60_000 },
        ],
        positionsCount: 4,
        completedMissionsCount: 4,
        totalMissionsCount: 5,
        largestPositionPercentage: 35,
      },
      "financial_hall",
    );

    expect(hall.level).toBe(5);
    expect(hall.reason).toContain("diversificacao");
  });

  it("reduces city maturity when portfolio is overly concentrated", () => {
    const balancedHall = building(
      {
        ...baseInput,
        totalEquityCents: 150_000,
        availableBalanceCents: 20_000,
        allocationByClass: [
          { assetClass: "FIXED_INCOME", percentage: 30, valueCents: 45_000 },
          { assetClass: "STOCK", percentage: 30, valueCents: 45_000 },
        ],
        positionsCount: 3,
        completedMissionsCount: 3,
        totalMissionsCount: 5,
        largestPositionPercentage: 45,
      },
      "financial_hall",
    );
    const concentratedHall = building(
      {
        ...baseInput,
        totalEquityCents: 150_000,
        allocationByClass: [
          { assetClass: "STOCK", percentage: 90, valueCents: 135_000 },
        ],
        positionsCount: 1,
        completedMissionsCount: 3,
        totalMissionsCount: 5,
        hasConcentrationWarning: true,
        largestPositionPercentage: 90,
      },
      "financial_hall",
    );

    expect(concentratedHall.progressPercent).toBeLessThan(balancedHall.progressPercent);
    expect(concentratedHall.reason).toContain("concentracao elevada");
  });

  it("evolves financial school when missions are completed", () => {
    const school = building(
      {
        ...baseInput,
        completedMissionsCount: 3,
        totalMissionsCount: 5,
      },
      "financial_school",
    );

    expect(school.level).toBe(4);
    expect(school.reason).toContain("3 de 5");
  });

  it("evolves income park when income was collected", () => {
    const park = building(
      {
        ...baseInput,
        collectedIncomeCents: 2_500,
      },
      "income_park",
    );

    expect(park.level).toBeGreaterThanOrEqual(3);
    expect(park.reason).toContain("Rendimentos simulados");
  });

  it("evolves mentor tower when mentor messages exist", () => {
    const tower = building(
      {
        ...baseInput,
        mentorMessagesCount: 2,
      },
      "mentor_tower",
    );

    expect(tower.level).toBe(3);
    expect(tower.reason).toContain("Mentor");
  });
});
