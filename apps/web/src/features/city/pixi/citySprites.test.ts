import { describe, expect, it } from "vitest";
import { CITY_BUILDING_IDS, CITY_BUILDING_POSITIONS } from "./cityScene.constants.js";
import {
  CITY_BUILDING_SPRITES,
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

  it("maps each known building to l0, l1 and l2 placeholders", () => {
    for (const buildingId of CITY_BUILDING_IDS) {
      expect(CITY_BUILDING_SPRITES[buildingId][0]).toContain(`building_${buildingId}_l0.svg`);
      expect(CITY_BUILDING_SPRITES[buildingId][1]).toContain(`building_${buildingId}_l1.svg`);
      expect(CITY_BUILDING_SPRITES[buildingId][2]).toContain(`building_${buildingId}_l2.svg`);
    }

    expect(validateCitySpriteRegistry()).toBe(true);
  });

  it.each([
    [0, 0],
    [1, 1],
    [2, 1],
    [3, 2],
    [5, 2],
  ] as const)("maps level %i to visual stage %i", (level, expectedStage) => {
    expect(getVisualStageFromLevel(level)).toBe(expectedStage);
  });
});
