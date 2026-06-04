import type { CityBuildingViewModel } from "../city.types.js";
import { cityIsoToScreen } from "../data/citySceneLayout.js";

const statusLabels: Record<CityBuildingViewModel["status"], string> = {
  locked: "Bloqueado",
  started: "Nivel 1",
  growing: "Nivel 2",
  strong: "Nivel 3",
};

export function CityBuildingLayer({
  buildings,
  selectedBuildingId,
  onBuildingClick,
}: {
  buildings: CityBuildingViewModel[];
  selectedBuildingId?: string;
  onBuildingClick: (building: CityBuildingViewModel) => void;
}) {
  const orderedBuildings = [...buildings].sort(
    (left, right) =>
      left.position.tileX +
      left.position.tileY -
      (right.position.tileX + right.position.tileY),
  );

  return (
    <div className="city-layer city-building-layer">
      {orderedBuildings.map((building) => {
        const position = cityIsoToScreen(building.position.tileX, building.position.tileY);
        const stage = Math.max(1, building.level);
        const assetPath = `/assets/city/buildings/${building.assetPrefix}_stage_${stage}.png`;
        const isLocked = building.status === "locked";

        return (
          <button
            key={building.id}
            type="button"
            className={`city-scene-building city-scene-building-${building.status}`}
            style={{
              left: position.x,
              top: position.y,
              zIndex: 100 + building.position.tileX + building.position.tileY,
            }}
            aria-pressed={building.id === selectedBuildingId}
            aria-label={`${building.name}, ${statusLabels[building.status]}`}
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
              <small>Stage {building.level}</small>
            </span>
            <span className="city-building-label">
              <strong>{building.shortLabel}</strong>
              <small>{statusLabels[building.status]}</small>
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
