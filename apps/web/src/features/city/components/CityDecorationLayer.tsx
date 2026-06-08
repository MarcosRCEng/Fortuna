import { CITY_MAP_CONFIG, getOrderedGridDecorations } from "../data/cityGridLayout.js";
import { isoToScreen } from "../data/isoMath.js";

export function CityDecorationLayer({
  showYieldCoin,
  showProgressSparkle,
}: {
  showYieldCoin: boolean;
  showProgressSparkle: boolean;
}) {
  const decorations = getOrderedGridDecorations({ showYieldCoin, showProgressSparkle });

  return (
    <div className="city-layer city-decoration-layer" aria-hidden="true">
      {decorations.map((decoration) => {
        const position = isoToScreen(decoration, CITY_MAP_CONFIG);

        return (
          <img
            key={decoration.id}
            className={`city-decoration city-decoration-${decoration.kind}`}
            src={decoration.asset}
            alt=""
            draggable={false}
            style={{
              left: position.x + (decoration.offsetX ?? 0),
              top: position.y + (decoration.offsetY ?? 0),
              width: decoration.width,
              zIndex: 80 + decoration.gridX + decoration.gridY,
            }}
          />
        );
      })}
    </div>
  );
}
