import { describe, expect, it } from "vitest";
import { isoToScreen, sortByIsoDepth } from "./isoMath.js";

describe("isoMath", () => {
  it("projects grid coordinates using the isometric formula", () => {
    const screen = isoToScreen(
      { gridX: 4, gridY: 2 },
      { width: 8, height: 8, tileWidth: 100, tileHeight: 50, originX: 300, originY: 80 },
    );

    expect(screen).toEqual({
      x: 300 + ((4 - 2) * 100) / 2,
      y: 80 + ((4 + 2) * 50) / 2,
    });
  });

  it("orders grid items by gridX plus gridY plus layerWeight", () => {
    const ordered = sortByIsoDepth([
      { id: "front", gridX: 4, gridY: 4, layerWeight: 0.8 },
      { id: "back", gridX: 1, gridY: 2, layerWeight: 0.8 },
      { id: "same-tile-shadow", gridX: 3, gridY: 3, layerWeight: 0.1 },
      { id: "same-tile-building", gridX: 3, gridY: 3, layerWeight: 0.4 },
    ]);

    expect(ordered.map((item) => item.id)).toEqual([
      "back",
      "same-tile-shadow",
      "same-tile-building",
      "front",
    ]);
  });
});
