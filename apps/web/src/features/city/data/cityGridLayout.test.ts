import { describe, expect, it } from "vitest";
import { deriveCityBuildings } from "../city.rules.js";
import type { DeriveCityInput } from "../city.types.js";
import {
  CITY_MAP_CONFIG,
  cityGridTiles,
  createCityGridBuildings,
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

  it("keeps mandatory level-one visual buildings on the initial city map", () => {
    const gridBuildings = createCityGridBuildings(deriveCityBuildings(emptyInput));
    const byId = new Map(gridBuildings.map((building) => [building.id, building]));

    for (const buildingId of [
      "financial_hall",
      "mentor_tower",
      "income_park",
      "reserve_bank",
      "financial_school",
      "city_exchange",
    ] as const) {
      expect(byId.get(buildingId)?.level).toBe(1);
      expect(byId.get(buildingId)?.asset).toContain("stage_1.png");
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
