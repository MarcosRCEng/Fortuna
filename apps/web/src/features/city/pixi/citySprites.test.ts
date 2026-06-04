import { describe, expect, it } from "vitest";
import { CITY_BUILDING_ASSET_MANIFEST_SET } from "./cityAssetManifest.js";
import { CITY_BUILDING_IDS, CITY_BUILDING_POSITIONS } from "./cityScene.constants.js";
import {
  getCityBuildingCatalogItem,
  getCityBuildingPosition,
} from "../data/cityLayout.selectors.js";
import {
  CITY_BUILDING_PLACEHOLDER_SPRITES,
  CITY_BUILDING_SPRITES,
  getBuildingSprite,
  getBuildingSpriteScale,
  getCityBuildingMaturityBadgeLabel,
  getCityBuildingStageLabel,
  getVisualStageFromLevel,
  validateCitySpriteRegistry,
} from "./citySprites.js";

describe("city sprite registry", () => {
  it("maps each known building to a fixed isometric position", () => {
    for (const buildingId of CITY_BUILDING_IDS) {
      expect(CITY_BUILDING_POSITIONS[buildingId]).toBe(
        getCityBuildingPosition(buildingId),
      );
      expect(getCityBuildingPosition(buildingId)).toEqual(
        expect.objectContaining({
          tileX: expect.any(Number),
          tileY: expect.any(Number),
        }),
      );
    }
  });

  it("maps each known building to stage 0, stage 1, stage 2 and stage 3 assets", () => {
    for (const buildingId of CITY_BUILDING_IDS) {
      const { assetPrefix } = getCityBuildingCatalogItem(buildingId);

      expect(CITY_BUILDING_SPRITES[buildingId][0]).toContain(
        `${assetPrefix}_stage_0.png`,
      );
      expect(CITY_BUILDING_SPRITES[buildingId][1]).toContain(
        `${assetPrefix}_stage_1.png`,
      );
      expect(CITY_BUILDING_SPRITES[buildingId][2]).toContain(
        `${assetPrefix}_stage_2.png`,
      );
      expect(CITY_BUILDING_SPRITES[buildingId][3]).toContain(
        `${assetPrefix}_stage_3.png`,
      );
    }

    expect(validateCitySpriteRegistry()).toBe(true);
  });

  it("keeps placeholder sprites available as documented fallback assets", () => {
    for (const buildingId of CITY_BUILDING_IDS) {
      expect(CITY_BUILDING_PLACEHOLDER_SPRITES[buildingId][0]).toContain(
        `building_${buildingId}_l0.svg`,
      );
      expect(CITY_BUILDING_PLACEHOLDER_SPRITES[buildingId][1]).toContain(
        `building_${buildingId}_l1.svg`,
      );
      expect(CITY_BUILDING_PLACEHOLDER_SPRITES[buildingId][2]).toContain(
        `building_${buildingId}_l2.svg`,
      );
      expect(CITY_BUILDING_PLACEHOLDER_SPRITES[buildingId][3]).toContain(
        `building_${buildingId}_l2.svg`,
      );
    }
  });

  it.each([
    [0, 0],
    [1, 1],
    [2, 1],
    [3, 2],
    [4, 2],
    [5, 3],
  ] as const)("maps level %i to visual stage %i", (level, expectedStage) => {
    expect(getVisualStageFromLevel(level)).toBe(expectedStage);
  });

  it.each([
    [0, 0.11],
    [1, 0.14],
    [2, 0.14],
    [3, 0.17],
    [4, 0.17],
    [5, 0.19],
  ] as const)("maps level %i to sprite scale %f", (level, expectedScale) => {
    expect(getBuildingSpriteScale(level)).toBe(expectedScale);
  });

  it.each([
    [0, "Stage 0/3", "Bloqueado"],
    [1, "Stage 1/3", "Primeiros passos"],
    [2, "Stage 1/3", "Primeiros passos"],
    [3, "Stage 2/3", "Em crescimento"],
    [4, "Stage 2/3", "Em crescimento"],
    [5, "Stage 3/3", "Maduro"],
  ] as const)(
    "maps level %i to display stage %s and badge %s",
    (level, expectedStageLabel, expectedBadgeLabel) => {
      expect(getCityBuildingStageLabel(level)).toBe(expectedStageLabel);
      expect(getCityBuildingMaturityBadgeLabel(level)).toBe(expectedBadgeLabel);
    },
  );

  it("uses catalog asset prefixes for level 1 building sprites", () => {
    expect(getBuildingSprite("financial_hall", 1)).toBe(
      "/assets/city/buildings/building_financial_hall_stage_1.png",
    );
    expect(getBuildingSprite("income_park", 1)).toBe(
      "/assets/city/buildings/building_income_park_stage_1.png",
    );
    expect(getBuildingSprite("mentor_tower", 1)).toBe(
      "/assets/city/buildings/building_mentor_tower_stage_1.png",
    );
  });

  it("uses stage assets as the primary path before placeholder fallback", () => {
    expect(getBuildingSprite("financial_hall", 0)).toContain(
      "building_financial_hall_stage_0.png",
    );
    expect(getBuildingSprite("financial_hall", 0)).toContain(
      "/assets/city/buildings/",
    );
    expect(getBuildingSprite("financial_hall", 1)).toContain(
      "building_financial_hall_stage_1.png",
    );
    expect(getBuildingSprite("financial_hall", 1)).not.toContain(
      "building_financial_hall_stage_2.png",
    );
  });

  it("falls back to development SVG when a built asset is not in the manifest", () => {
    const assetPath = "/assets/city/buildings/building_financial_hall_stage_1.png";

    CITY_BUILDING_ASSET_MANIFEST_SET.delete(assetPath);

    try {
      expect(getBuildingSprite("financial_hall", 1)).toContain(
        "building_financial_hall_l1.svg",
      );
    } finally {
      CITY_BUILDING_ASSET_MANIFEST_SET.add(assetPath);
    }
  });
});
