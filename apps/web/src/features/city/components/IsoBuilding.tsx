import {
  getCityBuildingMaturityBadgeLabel,
  getCityBuildingStageLabel,
} from "../pixi/citySprites.js";
import type { CityGridBuilding } from "../data/cityGridLayout.js";

export function IsoBuilding({
  building,
  selected,
  onSelect,
}: {
  building: CityGridBuilding;
  selected: boolean;
  onSelect: (building: CityGridBuilding["viewModel"]) => void;
}) {
  const statusLabel = getCityBuildingMaturityBadgeLabel(building.viewModel.level);

  return (
    <button
      type="button"
      className={`city-iso-building city-iso-building-${building.status} city-iso-building-stage-${building.visualStage} city-iso-building-construction-${building.constructionState}`}
      style={{
        left: building.screenX,
        top: building.screenY,
        zIndex: 100 + building.gridX + building.gridY,
        width: building.renderWidth,
        ["--building-anchor-x" as string]: `${building.anchorX * -100}%`,
        ["--building-anchor-y" as string]: `${building.anchorY * -100}%`,
      }}
      data-building-id={building.id}
      data-grid-x={building.gridX}
      data-grid-y={building.gridY}
      data-size-x={building.sizeX}
      data-size-y={building.sizeY}
      aria-pressed={selected}
      aria-label={`${building.viewModel.name}, ${statusLabel}`}
      onClick={() => onSelect(building.viewModel)}
    >
      <img
        className="city-iso-building-asset"
        src={building.asset}
        alt=""
        loading="lazy"
        draggable={false}
        onError={(event) => {
          event.currentTarget.hidden = true;
          const parent = event.currentTarget.closest(".city-iso-building");
          parent?.classList.add("city-iso-building-fallback");
          if (import.meta.env.DEV) {
            console.warn(`Asset da Cidade Fortuna nao carregou: ${building.asset}`);
          }
        }}
      />
      <span className="city-building-fallback-label">
        {building.viewModel.shortLabel}
        <small>{getCityBuildingStageLabel(building.viewModel.level)}</small>
      </span>
      <span className="city-building-label">
        <strong>{building.viewModel.shortLabel}</strong>
        <small>{statusLabel}</small>
      </span>
    </button>
  );
}
