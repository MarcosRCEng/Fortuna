import { describe, expect, it } from "vitest";
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

  it("maps each known building to blocked placeholder, stage 1, stage 2 and stage 3 assets", () => {
    for (const buildingId of CITY_BUILDING_IDS) {
      const { assetPrefix } = getCityBuildingCatalogItem(buildingId);

      expect(CITY_BUILDING_SPRITES[buildingId][0]).toContain(
        `building_${buildingId}_l0.svg`,
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

  it("uses stage 1 asset for level 1 and placeholder for level 0", () => {
    expect(getBuildingSprite("financial_hall", 0)).toContain(
      "building_financial_hall_l0.svg",
    );
    expect(getBuildingSprite("financial_hall", 1)).toContain(
      "building_financial_hall_stage_1.png",
    );
    expect(getBuildingSprite("financial_hall", 1)).not.toContain(
      "building_financial_hall_stage_2.png",
    );
  });
});
