import type { CityBuildingViewModel } from "./city.types.js";

const statusLabels: Record<CityBuildingViewModel["status"], string> = {
  locked: "Ainda nao iniciado",
  started: "Primeiros passos",
  growing: "Em desenvolvimento",
  strong: "Bem desenvolvido",
};

export function CityBuildingCard({
  building,
}: {
  building: CityBuildingViewModel;
}) {
  return (
    <article className={`city-card city-card-${building.status}`}>
      <div className="city-card-topline">
        <span className="city-card-icon" aria-hidden="true">
          {building.icon}
        </span>
        <span className={`city-card-status city-card-status-${building.status}`}>
          {statusLabels[building.status]}
        </span>
      </div>
      <div>
        <h2>{building.name}</h2>
        <strong>
          Nivel {building.level}/{building.maxLevel}
        </strong>
      </div>
      <p>{building.description}</p>
      <div className="city-progress" aria-label={`Progresso ${building.progressPercent}%`}>
        <span style={{ width: `${building.progressPercent}%` }} />
      </div>
      <span className="city-progress-label">{building.progressPercent}% ate o proximo marco</span>
      <div className="city-card-section">
        <span>Motivo</span>
        <p>{building.reason}</p>
      </div>
      <div className="city-card-section">
        <span>O que evolui este predio</span>
        <p>{building.nextLevelHint}</p>
      </div>
      <p className="city-educational-message">{building.educationalMessage}</p>
    </article>
  );
}
