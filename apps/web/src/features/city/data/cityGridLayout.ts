import type { CityBuildingType, CityBuildingViewModel } from "../city.types.js";
import {
  CITY_DECORATION_ASSETS,
  CITY_TERRAIN_ASSETS,
  cityBuildingVisualRegistry,
  getCityBuildingAssetPath,
  type CityRoadAssetKey,
  type CityTerrainAssetKey,
} from "./cityAssets.js";
import {
  resolveCityBuildingVisualState,
  type CityBuildingConstructionState,
} from "./cityBuildingVisualState.js";
import {
  getFootprintBottomCenter,
  isWithinGrid,
  sortByIsoDepth,
  type IsoGridConfig,
  type IsoGridPoint,
} from "./isoMath.js";
import type { CityVisualStage } from "../types/city-render.types.js";

export const CITY_MAP_CONFIG: IsoGridConfig = {
  width: 11,
  height: 10,
  tileWidth: 104,
  tileHeight: 52,
  originX: 520,
  originY: 74,
};

export type CityTileType = "grass" | "road" | "plaza" | "empty_lot";

export type CityRoadDirection = "north" | "east" | "south" | "west";

export type CityRoadTile = {
  variant: CityRoadAssetKey;
  connections: CityRoadDirection[];
  rotation: number;
};

export type CityGridTile = IsoGridPoint & {
  id: string;
  type: CityTileType;
  terrainAsset: string;
  terrainKey: CityTerrainAssetKey;
  road?: CityRoadTile;
};

export type CityGridBuilding = IsoGridPoint & {
  id: CityBuildingType;
  type: string;
  sizeX: number;
  sizeY: number;
  level: number;
  status: CityBuildingViewModel["status"];
  visualStage: CityVisualStage;
  constructionState: CityBuildingConstructionState;
  asset: string;
  renderWidth: number;
  anchorX: number;
  anchorY: number;
  offsetX: number;
  offsetY: number;
  badgeOffsetY: number;
  screenX: number;
  screenY: number;
  layerWeight: number;
  viewModel: CityBuildingViewModel;
};

export type CityDecorationKind =
  | "tree"
  | "round-tree"
  | "bench"
  | "lamp"
  | "fountain"
  | "hedge"
  | "sparkle"
  | "coin";

export type CityGridDecoration = IsoGridPoint & {
  id: string;
  kind: CityDecorationKind;
  asset: string;
  offsetX: number;
  offsetY: number;
  width: number;
  layerWeight: number;
};

const roadCoordinates = [
  [3, 1],
  [3, 2],
  [3, 3],
  [1, 4],
  [2, 4],
  [3, 4],
  [4, 4],
  [5, 4],
  [6, 4],
  [7, 4],
  [8, 4],
  [9, 4],
  [3, 5],
  [3, 6],
  [3, 7],
  [7, 3],
  [8, 3],
  [6, 5],
  [6, 6],
  [6, 7],
  [7, 7],
  [8, 7],
  [9, 7],
] as const;

const plazaCoordinates = [
  [1, 3],
  [2, 3],
  [4, 1],
  [5, 1],
  [6, 2],
  [6, 3],
  [0, 4],
  [0, 5],
  [4, 5],
  [5, 5],
  [7, 5],
  [7, 6],
  [7, 8],
  [7, 9],
  [7, 1],
  [7, 2],
  [9, 3],
] as const;

const roadSet = new Set(roadCoordinates.map(([gridX, gridY]) => createGridKey(gridX, gridY)));
const plazaSet = new Set(plazaCoordinates.map(([gridX, gridY]) => createGridKey(gridX, gridY)));
const urbanAccessSet = new Set([...roadSet, ...plazaSet]);

const roadDirections: Array<{
  direction: CityRoadDirection;
  deltaX: number;
  deltaY: number;
}> = [
  { direction: "north", deltaX: 0, deltaY: -1 },
  { direction: "east", deltaX: 1, deltaY: 0 },
  { direction: "south", deltaX: 0, deltaY: 1 },
  { direction: "west", deltaX: -1, deltaY: 0 },
];

const roadDirectionNames: CityRoadDirection[] = ["north", "east", "south", "west"];

const directionRotation: Record<CityRoadDirection, number> = {
  north: 0,
  east: 90,
  south: 180,
  west: 270,
};

export const cityGridDecorations: CityGridDecoration[] = [
  createDecoration("tree-school", 0, 2, "round-tree", 16, -8, 50, 0.7),
  createDecoration("bench-school", 2, 3, "bench", -18, 10, 42, 0.7),
  createDecoration("lamp-civic", 6, 3, "lamp", 20, -4, 32, 0.7),
  createDecoration("fountain-civic", 5, 5, "fountain", 2, 0, 58, 0.7),
  createDecoration("hedge-reserve", 0, 6, "hedge", 18, 8, 62, 0.7),
  createDecoration("tree-reserve", 2, 7, "tree", -10, -6, 48, 0.7),
  createDecoration("lamp-exchange", 10, 3, "lamp", -16, -4, 32, 0.7),
  createDecoration("tree-mentor", 10, 6, "round-tree", -20, -4, 50, 0.7),
  createDecoration("coin-income", 5, 6, "coin", 28, -54, 28, 0.9),
  createDecoration("sparkle-hall", 5, 2, "sparkle", 30, -70, 28, 0.9),
];

export const cityGridTiles = createCityGridTiles();

export function createCityGridBuildings(
  buildings: readonly CityBuildingViewModel[],
): CityGridBuilding[] {
  const viewModelsById = new Map(buildings.map((building) => [building.id, building]));

  return sortByIsoDepth(
    Object.values(cityBuildingVisualRegistry).flatMap((definition) => {
      const viewModel = viewModelsById.get(definition.id);

      if (!viewModel) {
        return [];
      }

      const anchor = getFootprintBottomCenter(definition, CITY_MAP_CONFIG);
      const visualState = resolveCityBuildingVisualState({
        level: viewModel.level,
        status: viewModel.status,
      });

      return {
        id: definition.id,
        type: definition.type,
        gridX: definition.gridX,
        gridY: definition.gridY,
        sizeX: definition.sizeX,
        sizeY: definition.sizeY,
        level: viewModel.level,
        status: viewModel.status,
        visualStage: visualState.visualStage,
        constructionState: visualState.constructionState,
        asset: getCityBuildingAssetPath(
          definition.id,
          viewModel.level,
          viewModel.status,
        ),
        renderWidth: definition.renderWidth,
        anchorX: definition.anchorX,
        anchorY: definition.anchorY,
        offsetX: definition.offsetX,
        offsetY: definition.offsetY,
        badgeOffsetY: definition.badgeOffsetY,
        screenX: anchor.x + definition.offsetX,
        screenY: anchor.y + definition.offsetY,
        layerWeight: definition.layerWeight,
        viewModel,
      };
    }),
  );
}

export function getCityBuildingGridDefinition(buildingId: CityBuildingType) {
  return cityBuildingVisualRegistry[buildingId];
}

export function getOrderedGridDecorations({
  showYieldCoin,
  showProgressSparkle,
}: {
  showYieldCoin: boolean;
  showProgressSparkle: boolean;
}) {
  return sortByIsoDepth(
    cityGridDecorations.filter((decoration) => {
      if (decoration.kind === "coin") {
        return showYieldCoin;
      }

      if (decoration.kind === "sparkle") {
        return showProgressSparkle;
      }

      return true;
    }),
  );
}

export function getRoadVariantForTile(
  tile: Pick<CityGridTile, "gridX" | "gridY">,
): CityRoadTile | undefined {
  if (!roadSet.has(createGridKey(tile.gridX, tile.gridY))) {
    return undefined;
  }

  const connections = getRoadConnections(tile.gridX, tile.gridY);

  return resolveRoadTile(connections);
}

export function getBuildingUrbanAccessPoints(
  building: Pick<CityGridBuilding, "gridX" | "gridY" | "sizeX" | "sizeY">,
): IsoGridPoint[] {
  return getBuildingConnectedUrbanAccessPoints(
    building,
    getConnectedUrbanNetworkSet(),
  );
}

export function validateCityGridLayout(): string[] {
  const errors: string[] = [];
  const connectedUrbanNetwork = getConnectedUrbanNetworkSet();

  for (const building of Object.values(cityBuildingVisualRegistry)) {
    for (const point of getBuildingFootprint(building)) {
      if (!isWithinGrid(point, CITY_MAP_CONFIG)) {
        errors.push(`${building.id} esta fora da grade em ${point.gridX}:${point.gridY}`);
      }
      if (roadSet.has(createGridKey(point.gridX, point.gridY))) {
        errors.push(`${building.id} sobrepoe rua em ${point.gridX}:${point.gridY}`);
      }
      if (plazaSet.has(createGridKey(point.gridX, point.gridY))) {
        errors.push(`${building.id} sobrepoe acesso urbano em ${point.gridX}:${point.gridY}`);
      }
    }

    if (getBuildingConnectedUrbanAccessPoints(building, connectedUrbanNetwork).length === 0) {
      errors.push(`${building.id} sem acesso urbano conectado`);
    }
  }

  for (const [gridX, gridY] of roadCoordinates) {
    if (!isWithinGrid({ gridX, gridY }, CITY_MAP_CONFIG)) {
      errors.push(`Rua fora da grade em ${gridX}:${gridY}`);
    }
  }

  for (const [gridX, gridY] of plazaCoordinates) {
    const key = createGridKey(gridX, gridY);

    if (!isWithinGrid({ gridX, gridY }, CITY_MAP_CONFIG)) {
      errors.push(`Praca/caminho fora da grade em ${gridX}:${gridY}`);
    }
    if (roadSet.has(key)) {
      errors.push(`Praca/caminho sobrepoe rua em ${gridX}:${gridY}`);
    }
    if (!connectedUrbanNetwork.has(key)) {
      errors.push(`Praca/caminho desconectado em ${gridX}:${gridY}`);
    }
  }

  return errors;
}

function createCityGridTiles(): CityGridTile[] {
  const buildingFootprintSet = createBuildingFootprintSet();

  return Array.from({ length: CITY_MAP_CONFIG.height }, (_, gridY) =>
    Array.from({ length: CITY_MAP_CONFIG.width }, (_, gridX) => {
      const key = createGridKey(gridX, gridY);
      const road = getRoadVariantForTile({ gridX, gridY });
      const type = resolveTileType(key, buildingFootprintSet, road);
      const terrainKey = resolveTerrainKey(type);

      return {
        id: key,
        gridX,
        gridY,
        type,
        terrainKey,
        terrainAsset: CITY_TERRAIN_ASSETS[terrainKey],
        road,
      };
    }),
  ).flat();
}

function resolveTileType(
  key: string,
  buildingFootprintSet: Set<string>,
  road?: CityRoadTile,
): CityTileType {
  if (road) {
    return "road";
  }

  if (plazaSet.has(key)) {
    return "plaza";
  }

  if (buildingFootprintSet.has(key)) {
    return "empty_lot";
  }

  return "grass";
}

function resolveTerrainKey(type: CityTileType): CityTerrainAssetKey {
  if (type === "plaza") {
    return "plaza";
  }

  if (type === "empty_lot") {
    return "empty_lot";
  }

  return "grass";
}

function getRoadConnections(gridX: number, gridY: number): CityRoadDirection[] {
  return roadDirections.filter(({ direction, deltaX, deltaY }) =>
    roadSet.has(createGridKey(gridX + deltaX, gridY + deltaY)),
  ).map(({ direction }) => direction);
}

function getBuildingConnectedUrbanAccessPoints(
  building: Pick<CityGridBuilding, "gridX" | "gridY" | "sizeX" | "sizeY">,
  connectedUrbanNetwork: Set<string>,
): IsoGridPoint[] {
  const footprint = getBuildingFootprint(building);
  const footprintKeys = new Set(
    footprint.map((point) => createGridKey(point.gridX, point.gridY)),
  );
  const accessByKey = new Map<string, IsoGridPoint>();

  for (const point of footprint) {
    for (const { deltaX, deltaY } of roadDirections) {
      const accessPoint = { gridX: point.gridX + deltaX, gridY: point.gridY + deltaY };
      const key = createGridKey(accessPoint.gridX, accessPoint.gridY);

      if (
        !footprintKeys.has(key) &&
        isWithinGrid(accessPoint, CITY_MAP_CONFIG) &&
        connectedUrbanNetwork.has(key)
      ) {
        accessByKey.set(key, accessPoint);
      }
    }
  }

  return [...accessByKey.values()];
}

function getConnectedUrbanNetworkSet() {
  const [startGridX, startGridY] = roadCoordinates[0];
  const visited = new Set<string>();
  const queue: IsoGridPoint[] = [{ gridX: startGridX, gridY: startGridY }];

  while (queue.length > 0) {
    const point = queue.shift();

    if (!point) {
      continue;
    }

    const key = createGridKey(point.gridX, point.gridY);

    if (visited.has(key) || !urbanAccessSet.has(key)) {
      continue;
    }

    visited.add(key);

    for (const { deltaX, deltaY } of roadDirections) {
      const nextPoint = { gridX: point.gridX + deltaX, gridY: point.gridY + deltaY };
      const nextKey = createGridKey(nextPoint.gridX, nextPoint.gridY);

      if (urbanAccessSet.has(nextKey) && !visited.has(nextKey)) {
        queue.push(nextPoint);
      }
    }
  }

  return visited;
}

function resolveRoadTile(connections: CityRoadDirection[]): CityRoadTile {
  if (connections.length >= 4) {
    return { variant: "road_cross", connections, rotation: 0 };
  }

  if (connections.length === 3) {
    return {
      variant: "road_t",
      connections,
      rotation: getTJunctionRotation(connections),
    };
  }

  if (connections.length === 2 && areOpposite(connections[0], connections[1])) {
    return {
      variant: "road_straight",
      connections,
      rotation: connections.includes("east") ? 0 : 90,
    };
  }

  if (connections.length === 2) {
    return {
      variant: "road_corner",
      connections,
      rotation: getCornerRotation(connections),
    };
  }

  return {
    variant: "road_straight",
    connections,
    rotation: connections.includes("north") || connections.includes("south") ? 90 : 0,
  };
}

function getTJunctionRotation(connections: CityRoadDirection[]) {
  const missingDirection = roadDirectionNames.find(
    (direction) => !connections.includes(direction),
  );

  return missingDirection ? directionRotation[missingDirection] : 0;
}

function getCornerRotation(connections: CityRoadDirection[]) {
  if (connections.includes("north") && connections.includes("east")) {
    return 0;
  }
  if (connections.includes("east") && connections.includes("south")) {
    return 90;
  }
  if (connections.includes("south") && connections.includes("west")) {
    return 180;
  }

  return 270;
}

function areOpposite(left: CityRoadDirection, right: CityRoadDirection) {
  return (
    (left === "north" && right === "south") ||
    (left === "south" && right === "north") ||
    (left === "east" && right === "west") ||
    (left === "west" && right === "east")
  );
}

function createDecoration(
  id: string,
  gridX: number,
  gridY: number,
  kind: CityDecorationKind,
  offsetX: number,
  offsetY: number,
  width: number,
  layerWeight: number,
): CityGridDecoration {
  return {
    id,
    gridX,
    gridY,
    kind,
    asset: getDecorationAsset(kind),
    offsetX,
    offsetY,
    width,
    layerWeight,
  };
}

function getDecorationAsset(kind: CityDecorationKind) {
  if (kind === "round-tree") {
    return CITY_DECORATION_ASSETS.roundTree;
  }

  if (kind === "sparkle") {
    return CITY_DECORATION_ASSETS.sparkle;
  }

  if (kind === "coin") {
    return CITY_DECORATION_ASSETS.coin;
  }

  return CITY_DECORATION_ASSETS[kind];
}

function createBuildingFootprintSet() {
  return new Set(
    Object.values(cityBuildingVisualRegistry)
      .flatMap(getBuildingFootprint)
      .map((point) => createGridKey(point.gridX, point.gridY)),
  );
}

function getBuildingFootprint({
  gridX,
  gridY,
  sizeX,
  sizeY,
}: {
  gridX: number;
  gridY: number;
  sizeX: number;
  sizeY: number;
}) {
  const points: IsoGridPoint[] = [];

  for (let offsetY = 0; offsetY < sizeY; offsetY += 1) {
    for (let offsetX = 0; offsetX < sizeX; offsetX += 1) {
      points.push({ gridX: gridX + offsetX, gridY: gridY + offsetY });
    }
  }

  return points;
}

function createGridKey(gridX: number, gridY: number) {
  return `${gridX}:${gridY}`;
}

const layoutErrors = validateCityGridLayout();

if (layoutErrors.length > 0) {
  throw new Error(`Layout invalido da Cidade Fortuna: ${layoutErrors.join("; ")}`);
}
