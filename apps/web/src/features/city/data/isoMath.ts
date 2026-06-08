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

export function getIsoDepth({ gridX, gridY, layerWeight = 0 }: IsoDepthItem) {
  return gridX + gridY + layerWeight;
}

export function sortByIsoDepth<T extends IsoDepthItem>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => getIsoDepth(left) - getIsoDepth(right));
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
