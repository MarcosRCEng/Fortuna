import type { CityBuildingViewModel } from "../city.types.js";
import {
  getCityBuildingMaturityBadgeLabel,
  getCityBuildingStageLabel,
} from "../pixi/citySprites.js";

export function CityBuildingDetailsModal({
  building,
  onClose,
}: {
  building: CityBuildingViewModel;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-labelledby="city-building-modal-title"
        className="modal city-building-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-actions">
          <h2 id="city-building-modal-title">{building.name}</h2>
          <button className="button button-ghost" type="button" onClick={onClose}>
            Fechar
          </button>
        </div>

        <p>{building.description}</p>
        <p className="educational-note">{building.purpose}</p>

        <dl className="data-grid modal-summary">
          <div>
            <dt>Nivel atual</dt>
            <dd>
              {getCityBuildingStageLabel(building.level)}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{getCityBuildingMaturityBadgeLabel(building.level)}</dd>
          </div>
          <div>
            <dt>Progresso</dt>
            <dd>{building.progressPercent}%</dd>
          </div>
          <div>
            <dt>Distrito</dt>
            <dd>{building.district}</dd>
          </div>
        </dl>

        <div className="city-progress" aria-label={`Progresso ${building.progressPercent}%`}>
          <span style={{ width: `${building.progressPercent}%` }} />
        </div>

        <div className="city-card-section">
          <span>Motivo</span>
          <p>{building.reason}</p>
        </div>
        <div className="city-card-section">
          <span>O que evolui este predio</span>
          <p>{building.nextLevelHint}</p>
        </div>
        <div className="city-card-section">
          <span>Proxima acao educativa</span>
          <p>{building.nextAction}</p>
        </div>
        {building.route ? (
          <a className="button button-primary city-route-button" href={building.route}>
            Navegar para area relacionada
          </a>
        ) : null}
        <p className="city-educational-message">{building.educationalMessage}</p>
      </section>
    </div>
  );
}
