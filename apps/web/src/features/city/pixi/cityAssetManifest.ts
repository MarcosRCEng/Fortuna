import { getCityBuildingCatalogItem } from "../data/cityLayout.selectors.js";
import { CITY_BUILDING_IDS } from "./cityScene.constants.js";

export const CITY_BUILDING_ASSET_BASE_PATH = "/assets/city/buildings";

export const CITY_BUILDING_VISUAL_STAGES = [0, 1, 2, 3] as const;

export const CITY_BUILDING_ASSET_MANIFEST = CITY_BUILDING_IDS.flatMap((buildingId) => {
  const { assetPrefix } = getCityBuildingCatalogItem(buildingId);

  return CITY_BUILDING_VISUAL_STAGES.map(
    (visualStage) =>
      `${CITY_BUILDING_ASSET_BASE_PATH}/${assetPrefix}_stage_${visualStage}.png`,
  );
});

export const CITY_BUILDING_ASSET_MANIFEST_SET = new Set(
  CITY_BUILDING_ASSET_MANIFEST,
);
