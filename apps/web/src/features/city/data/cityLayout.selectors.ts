import type { CityBuildingType } from "../city.types.js";
import type { CityTilePosition } from "../types/city-render.types.js";
import {
  cityBuildingsCatalog,
  type CityBuildingCatalogItem,
} from "./cityBuildingsCatalog.js";

const cityBuildingsById = new Map<CityBuildingType, CityBuildingCatalogItem>(
  cityBuildingsCatalog.map((item) => [item.id, item]),
);

export function getCityBuildingCatalogItem(
  buildingId: CityBuildingType,
): CityBuildingCatalogItem {
  const catalogItem = cityBuildingsById.get(buildingId);

  if (!catalogItem) {
    throw new Error(`Predio da Cidade Fortuna sem catalogo: ${buildingId}`);
  }

  return catalogItem;
}

export function getCityBuildingPosition(buildingId: CityBuildingType): CityTilePosition {
  return getCityBuildingCatalogItem(buildingId).position;
}

export function getOrderedCityBuildingsForRender<T extends { id: CityBuildingType }>(
  buildings: readonly T[],
): T[] {
  return [...buildings].sort((left, right) => {
    const leftCatalogItem = getCityBuildingCatalogItem(left.id);
    const rightCatalogItem = getCityBuildingCatalogItem(right.id);
    const leftDepth = leftCatalogItem.position.tileX + leftCatalogItem.position.tileY;
    const rightDepth = rightCatalogItem.position.tileX + rightCatalogItem.position.tileY;

    if (leftDepth !== rightDepth) {
      return leftDepth - rightDepth;
    }

    return leftCatalogItem.visualPriority - rightCatalogItem.visualPriority;
  });
}
