import { describe, expect, it } from "vitest";
import type { CityBuildingType } from "../city.types.js";
import { cityBuildingsCatalog } from "./cityBuildingsCatalog.js";
import {
  getCityBuildingCatalogItem,
  getCityBuildingPosition,
  getOrderedCityBuildingsForRender,
} from "./cityLayout.selectors.js";

describe("city layout selectors", () => {
  it("reads catalog items and positions from the city buildings catalog", () => {
    for (const catalogItem of cityBuildingsCatalog) {
      expect(getCityBuildingCatalogItem(catalogItem.id)).toBe(catalogItem);
      expect(getCityBuildingPosition(catalogItem.id)).toBe(catalogItem.position);
    }
  });

  it("orders buildings by isometric depth before visual priority", () => {
    const reversedBuildings = [...cityBuildingsCatalog].reverse().map((item) => ({
      id: item.id,
    }));
    const orderedIds = getOrderedCityBuildingsForRender(reversedBuildings).map(
      (item) => item.id,
    );
    const expectedIds = [...cityBuildingsCatalog]
      .sort((left, right) => {
        const leftDepth = left.position.tileX + left.position.tileY;
        const rightDepth = right.position.tileX + right.position.tileY;

        if (leftDepth !== rightDepth) {
          return leftDepth - rightDepth;
        }

        return left.visualPriority - right.visualPriority;
      })
      .map((item) => item.id);

    expect(orderedIds).toEqual(expectedIds);
    expect(orderedIds).toEqual([
      "financial_school",
      "financial_hall",
      "reserve_bank",
      "city_exchange",
      "income_park",
      "mentor_tower",
      "real_estate_center",
    ] satisfies CityBuildingType[]);
  });
});
