import type { CityScreenPosition } from "../types/city-render.types.js";

export const CITY_TILE_WIDTH = 96;
export const CITY_TILE_HEIGHT = 48;
export const CITY_ORIGIN_X = 420;
export const CITY_ORIGIN_Y = 72;

export function isoToScreen(tileX: number, tileY: number): CityScreenPosition {
  return {
    x: CITY_ORIGIN_X + (tileX - tileY) * (CITY_TILE_WIDTH / 2),
    y: CITY_ORIGIN_Y + (tileX + tileY) * (CITY_TILE_HEIGHT / 2),
  };
}
