import { describe, expect, it } from "vitest";
import { deriveCityBuildings } from "../city.rules.js";
import type { DeriveCityInput } from "../city.types.js";
import {
  CITY_MAP_CONFIG,
  cityGridTiles,
  createCityGridBuildings,
  getBuildingUrbanAccessPoints,
  getRoadVariantForTile,
  validateCityGridLayout,
} from "./cityGridLayout.js";

const emptyInput: DeriveCityInput = {
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

describe("city grid layout", () => {
  it("builds a configurable matrix with terrain, roads, plazas and lots", () => {
    expect(cityGridTiles).toHaveLength(CITY_MAP_CONFIG.width * CITY_MAP_CONFIG.height);
    expect(new Set(cityGridTiles.map((tile) => tile.type))).toEqual(
      new Set(["grass", "road", "plaza", "empty_lot"]),
    );
    expect(validateCityGridLayout()).toEqual([]);
  });

  it("chooses road variants from north south east west neighbors", () => {
    expect(getRoadVariantForTile({ gridX: 3, gridY: 2 })?.variant).toBe(
      "road_straight",
    );
    expect(getRoadVariantForTile({ gridX: 6, gridY: 7 })?.variant).toBe(
      "road_corner",
    );
    expect(getRoadVariantForTile({ gridX: 6, gridY: 4 })?.variant).toBe("road_t");
    expect(getRoadVariantForTile({ gridX: 3, gridY: 4 })?.variant).toBe(
      "road_cross",
    );
  });

  it("renders locked level-zero buildings as reserved foundations", () => {
    const gridBuildings = createCityGridBuildings(deriveCityBuildings(emptyInput));

    for (const building of gridBuildings) {
      expect(building.level).toBe(0);
      expect(building.status).toBe("locked");
      expect(building.visualStage).toBe(0);
      expect(building.constructionState).toBe("locked");
      expect(building.asset).toContain("stage_0.png");
    }
  });

  it("connects every visible building footprint to the urban network", () => {
    const gridBuildings = createCityGridBuildings(deriveCityBuildings(emptyInput));

    for (const building of gridBuildings) {
      const accessPoints = getBuildingUrbanAccessPoints(building);

      expect(accessPoints.length).toBeGreaterThan(0);
    }
  });

  it("sorts buildings by isometric depth before rendering", () => {
    const gridBuildings = createCityGridBuildings(deriveCityBuildings(emptyInput));

    expect(gridBuildings.map((building) => building.id)).toEqual([
      "financial_school",
      "financial_hall",
      "reserve_bank",
      "city_exchange",
      "income_park",
      "mentor_tower",
      "real_estate_center",
    ]);
  });
});
