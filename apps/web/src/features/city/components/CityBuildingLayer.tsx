import type { CityBuildingViewModel } from "../city.types.js";
import {
  getCityBuildingPosition,
  getOrderedCityBuildingsForRender,
} from "../data/cityLayout.selectors.js";
import { cityIsoToScreen } from "../data/citySceneLayout.js";
import {
  getBuildingSprite,
  getCityBuildingMaturityBadgeLabel,
  getCityBuildingStageLabel,
} from "../pixi/citySprites.js";

export function CityBuildingLayer({
  buildings,
  selectedBuildingId,
  onBuildingClick,
}: {
  buildings: CityBuildingViewModel[];
  selectedBuildingId?: string;
  onBuildingClick: (building: CityBuildingViewModel) => void;
}) {
  const orderedBuildings = getOrderedCityBuildingsForRender(buildings);

  return (
    <div className="city-layer city-building-layer">
      {orderedBuildings.map((building) => {
        const tilePosition = getCityBuildingPosition(building.id);
        const position = cityIsoToScreen(tilePosition.tileX, tilePosition.tileY);
        const assetPath = getBuildingSprite(building.id, building.level);
        const isLocked = building.status === "locked";
        const statusLabel = getCityBuildingMaturityBadgeLabel(building.level);

        return (
          <button
            key={building.id}
            type="button"
            className={`city-scene-building city-scene-building-${building.status}`}
            style={{
              left: position.x,
              top: position.y,
              zIndex: 100 + tilePosition.tileX + tilePosition.tileY,
            }}
            aria-pressed={building.id === selectedBuildingId}
            aria-label={`${building.name}, ${statusLabel}`}
            onClick={() => onBuildingClick(building)}
          >
            <span className="city-building-shadow" />
            {isLocked ? <span className="city-locked-plot" /> : null}
            <img
              src={assetPath}
              alt=""
              loading="lazy"
              draggable={false}
              onError={(event) => {
                event.currentTarget.hidden = true;
                const parent = event.currentTarget.closest(".city-scene-building");
                parent?.classList.add("city-scene-building-fallback");
                if (import.meta.env.DEV) {
                  console.warn(`Asset da Cidade Fortuna nao carregou: ${assetPath}`);
                }
              }}
            />
            <span className="city-building-fallback-label">
              {building.shortLabel}
              <small>{getCityBuildingStageLabel(building.level)}</small>
            </span>
            <span className="city-building-label">
              <strong>{building.shortLabel}</strong>
              <small>{statusLabel}</small>
            </span>
            {building.hasAction ? (
              <span className="city-action-indicator">{building.actionLabel ?? "Acao"}</span>
            ) : null}
            {building.alertLabel && !building.hasAction ? (
              <span className="city-alert-indicator">{building.alertLabel}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
