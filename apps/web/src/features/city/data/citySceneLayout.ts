export const CITY_SCENE_TILE_WIDTH = 104;
export const CITY_SCENE_TILE_HEIGHT = 52;
export const CITY_SCENE_ORIGIN = { x: 390, y: 76 };
export const CITY_SCENE_GRID = { width: 9, height: 8 };

export type CityDecoration = {
  id: string;
  tileX: number;
  tileY: number;
  kind: "tree" | "round-tree" | "bench" | "lamp" | "fountain" | "hedge" | "sparkle" | "coin";
  offsetX?: number;
  offsetY?: number;
};

export type CityBuildingPad = {
  id: string;
  tileX: number;
  tileY: number;
  width: number;
  height: number;
  variant: "civic" | "finance" | "park" | "campus" | "market";
};

export const cityBuildingPads: CityBuildingPad[] = [
  { id: "pad-reserve", tileX: 2.15, tileY: 3.45, width: 150, height: 76, variant: "finance" },
  { id: "pad-exchange", tileX: 5.25, tileY: 1.22, width: 146, height: 74, variant: "market" },
  { id: "pad-hall", tileX: 4.1, tileY: 2.85, width: 168, height: 88, variant: "civic" },
  { id: "pad-school", tileX: 2.05, tileY: 5.45, width: 150, height: 76, variant: "campus" },
  { id: "pad-estate", tileX: 6.55, tileY: 4.15, width: 150, height: 76, variant: "market" },
  { id: "pad-park", tileX: 4.9, tileY: 5.18, width: 172, height: 92, variant: "park" },
  { id: "pad-mentor", tileX: 7.45, tileY: 2.35, width: 156, height: 82, variant: "civic" },
  { id: "pad-center-green", tileX: 3.9, tileY: 5.95, width: 170, height: 88, variant: "park" },
];

export const cityDecorations: CityDecoration[] = [
  { id: "tree-west-1", tileX: 1, tileY: 2, kind: "tree", offsetX: -18, offsetY: -8 },
  { id: "tree-west-2", tileX: 1, tileY: 5, kind: "round-tree", offsetX: -12, offsetY: 6 },
  { id: "hedge-bank", tileX: 2, tileY: 2, kind: "hedge", offsetX: 20, offsetY: 10 },
  { id: "lamp-bank", tileX: 2, tileY: 4, kind: "lamp", offsetX: -30, offsetY: -4 },
  { id: "bench-center", tileX: 4, tileY: 4, kind: "bench", offsetX: -18, offsetY: 14 },
  { id: "fountain-center", tileX: 4, tileY: 5, kind: "fountain", offsetX: 6, offsetY: 2 },
  { id: "tree-campus-1", tileX: 1, tileY: 7, kind: "round-tree", offsetX: 10, offsetY: -4 },
  { id: "bench-campus", tileX: 2, tileY: 7, kind: "bench", offsetX: -24, offsetY: 12 },
  { id: "lamp-market", tileX: 6, tileY: 2, kind: "lamp", offsetX: 20, offsetY: -8 },
  { id: "tree-market", tileX: 6, tileY: 1, kind: "tree", offsetX: 18, offsetY: 0 },
  { id: "hedge-estate", tileX: 7, tileY: 5, kind: "hedge", offsetX: -10, offsetY: 8 },
  { id: "tree-estate", tileX: 7, tileY: 6, kind: "round-tree", offsetX: 20, offsetY: -8 },
  { id: "coin-park", tileX: 5, tileY: 5, kind: "coin", offsetX: 34, offsetY: -28 },
  { id: "sparkle-hall", tileX: 4, tileY: 2, kind: "sparkle", offsetX: 28, offsetY: -30 },
];

export function cityIsoToScreen(tileX: number, tileY: number) {
  return {
    x: CITY_SCENE_ORIGIN.x + (tileX - tileY) * (CITY_SCENE_TILE_WIDTH / 2),
    y: CITY_SCENE_ORIGIN.y + (tileX + tileY) * (CITY_SCENE_TILE_HEIGHT / 2),
  };
}
