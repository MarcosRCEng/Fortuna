import type { CityBuildingViewModel } from "../city.types.js";

export function CityHudOverlay({
  selectedBuilding,
  activeCount,
  actionCount,
  onOpenDetails,
}: {
  selectedBuilding: CityBuildingViewModel;
  activeCount: number;
  actionCount: number;
  onOpenDetails: () => void;
}) {
  return (
    <aside className="city-hud-overlay" aria-label="Resumo da Cidade Fortuna">
      <div className="city-hud-metrics">
        <span>
          <strong>{activeCount}</strong>
          ativos
        </span>
        <span>
          <strong>{actionCount}</strong>
          acoes
        </span>
        <span>
          <strong>{selectedBuilding.level}</strong>
          nivel
        </span>
      </div>
      <div className="city-hud-selection">
        <span className="section-kicker">{selectedBuilding.district}</span>
        <h2>{selectedBuilding.name}</h2>
        <p>{selectedBuilding.purpose}</p>
        <strong>{selectedBuilding.reason}</strong>
        <button type="button" className="button button-primary" onClick={onOpenDetails}>
          Ver detalhes
        </button>
      </div>
    </aside>
  );
}
