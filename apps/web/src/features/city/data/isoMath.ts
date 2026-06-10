export type IsoGridConfig = {
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  originX: number;
  originY: number;
};

export type IsoGridPoint = {
  gridX: number;
  gridY: number;
};

export type IsoScreenPoint = {
  x: number;
  y: number;
};

export type IsoDepthItem = IsoGridPoint & {
  layerWeight?: number;
};

export type IsoFootprint = IsoGridPoint & {
  sizeX: number;
  sizeY: number;
};

export function isoToScreen(
  { gridX, gridY }: IsoGridPoint,
  config: IsoGridConfig,
): IsoScreenPoint {
  const isoX = ((gridX - gridY) * config.tileWidth) / 2;
  const isoY = ((gridX + gridY) * config.tileHeight) / 2;

  return {
    x: config.originX + isoX,
    y: config.originY + isoY,
  };
}

export function getTileBottomCenter(
  point: IsoGridPoint,
  config: IsoGridConfig,
): IsoScreenPoint {
  const center = isoToScreen(point, config);

  return {
    x: center.x,
    y: center.y + config.tileHeight / 2,
  };
}

export function getFootprintBottomCenter(
  {
    gridX,
    gridY,
    sizeX,
    sizeY,
  }: IsoGridPoint & { sizeX: number; sizeY: number },
  config: IsoGridConfig,
): IsoScreenPoint {
  return getTileBottomCenter(
    {
      gridX: gridX + (sizeX - 1) / 2,
      gridY: gridY + sizeY - 1,
    },
    config,
  );
}

export function getFootprintDiamondPoints(
  { gridX, gridY, sizeX, sizeY }: IsoFootprint,
  config: IsoGridConfig,
): [IsoScreenPoint, IsoScreenPoint, IsoScreenPoint, IsoScreenPoint] {
  const north = isoToScreen({ gridX, gridY }, config);
  const east = isoToScreen({ gridX: gridX + sizeX - 1, gridY }, config);
  const south = isoToScreen(
    { gridX: gridX + sizeX - 1, gridY: gridY + sizeY - 1 },
    config,
  );
  const west = isoToScreen({ gridX, gridY: gridY + sizeY - 1 }, config);

  return [
    { x: north.x, y: north.y - config.tileHeight / 2 },
    { x: east.x + config.tileWidth / 2, y: east.y },
    { x: south.x, y: south.y + config.tileHeight / 2 },
    { x: west.x - config.tileWidth / 2, y: west.y },
  ];
}

export function getAnchoredFootprintDiamondPoints(
  footprint: IsoFootprint,
  config: IsoGridConfig,
  baseAnchor: IsoScreenPoint,
): [IsoScreenPoint, IsoScreenPoint, IsoScreenPoint, IsoScreenPoint] {
  const points = getFootprintDiamondPoints(footprint, config);
  const southPoint = points[2];
  const offsetX = baseAnchor.x - southPoint.x;
  const offsetY = baseAnchor.y - southPoint.y;

  return points.map((point) => ({
    x: point.x + offsetX,
    y: point.y + offsetY,
  })) as [IsoScreenPoint, IsoScreenPoint, IsoScreenPoint, IsoScreenPoint];
}

export function formatIsoSvgPoints(points: readonly IsoScreenPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function getIsoDepth({ gridX, gridY, layerWeight = 0 }: IsoDepthItem) {
  return gridX + gridY + layerWeight;
}

export function sortByIsoDepth<T extends IsoDepthItem>(
  items: readonly T[],
): T[] {
  return [...items].sort(
    (left, right) => getIsoDepth(left) - getIsoDepth(right),
  );
}

export function isWithinGrid(
  { gridX, gridY }: IsoGridPoint,
  { width, height }: Pick<IsoGridConfig, "width" | "height">,
) {
  return gridX >= 0 && gridY >= 0 && gridX < width && gridY < height;
}

export function getIsoMapDiamondPoints(config: IsoGridConfig) {
  const north = isoToScreen({ gridX: 0, gridY: 0 }, config);
  const east = isoToScreen({ gridX: config.width - 1, gridY: 0 }, config);
  const south = isoToScreen(
    { gridX: config.width - 1, gridY: config.height - 1 },
    config,
  );
  const west = isoToScreen({ gridX: 0, gridY: config.height - 1 }, config);

  return [north, east, south, west];
}
