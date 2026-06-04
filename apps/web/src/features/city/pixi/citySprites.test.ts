import { describe, expect, it } from "vitest";
import { CITY_BUILDING_IDS, CITY_BUILDING_POSITIONS } from "./cityScene.constants.js";
import {
  CITY_BUILDING_PLACEHOLDER_SPRITES,
  CITY_BUILDING_SPRITES,
  getBuildingSpriteScale,
  getVisualStageFromLevel,
  validateCitySpriteRegistry,
} from "./citySprites.js";

describe("city sprite registry", () => {
  it("maps each known building to a fixed isometric position", () => {
    for (const buildingId of CITY_BUILDING_IDS) {
      expect(CITY_BUILDING_POSITIONS[buildingId]).toEqual(
        expect.objectContaining({
          tileX: expect.any(Number),
          tileY: expect.any(Number),
        }),
      );
    }
  });

  it("maps each known building to stage 1, stage 2 and stage 3 assets", () => {
    for (const buildingId of CITY_BUILDING_IDS) {
      expect(CITY_BUILDING_SPRITES[buildingId][0]).toContain(
        `building_${buildingId}_stage_1.png`,
      );
      expect(CITY_BUILDING_SPRITES[buildingId][1]).toContain(
        `building_${buildingId}_stage_2.png`,
      );
      expect(CITY_BUILDING_SPRITES[buildingId][2]).toContain(
        `building_${buildingId}_stage_3.png`,
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
    }
  });

  it.each([
    [0, 0],
    [1, 0],
    [2, 1],
    [3, 2],
    [4, 2],
    [5, 2],
  ] as const)("maps level %i to visual stage %i", (level, expectedStage) => {
    expect(getVisualStageFromLevel(level)).toBe(expectedStage);
  });

  it.each([
    [0, 0.11],
    [1, 0.11],
    [2, 0.14],
    [3, 0.17],
    [4, 0.17],
    [5, 0.17],
  ] as const)("maps level %i to sprite scale %f", (level, expectedScale) => {
    expect(getBuildingSpriteScale(level)).toBe(expectedScale);
  });
});
