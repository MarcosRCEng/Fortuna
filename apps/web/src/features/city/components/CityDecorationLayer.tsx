import { cityDecorations, cityIsoToScreen } from "../data/citySceneLayout.js";

export function CityDecorationLayer({
  showYieldCoin,
  showProgressSparkle,
}: {
  showYieldCoin: boolean;
  showProgressSparkle: boolean;
}) {
  return (
    <div className="city-layer city-decoration-layer" aria-hidden="true">
      {cityDecorations.map((decoration) => {
        if (decoration.kind === "coin" && !showYieldCoin) {
          return null;
        }
        if (decoration.kind === "sparkle" && !showProgressSparkle) {
          return null;
        }

        const position = cityIsoToScreen(decoration.tileX, decoration.tileY);

        return (
          <span
            key={decoration.id}
            className={`city-decoration city-decoration-${decoration.kind}`}
            style={{
              left: position.x + (decoration.offsetX ?? 0),
              top: position.y + (decoration.offsetY ?? 0),
            }}
          />
        );
      })}
    </div>
  );
}
