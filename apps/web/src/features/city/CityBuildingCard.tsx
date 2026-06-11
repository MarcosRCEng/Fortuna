import type { CityBuildingViewModel } from "./city.types.js";

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
          {getBuildingStatusLabel(building.status)}
        </span>
      </div>

      <div>
        <h2>{building.name}</h2>
        <strong>{building.district}</strong>
      </div>

      <p>{building.description}</p>

      <dl className="city-card-meta">
        <div>
          <dt>Categoria</dt>
          <dd>{building.purpose}</dd>
        </div>
        <div>
          <dt>Nivel</dt>
          <dd>
            Nivel {building.level}/{building.maxLevel}
          </dd>
        </div>
        <div>
          <dt>Acesso</dt>
          <dd>{building.status === "locked" ? "Bloqueado" : "Desbloqueado"}</dd>
        </div>
      </dl>

      <div className="city-progress" aria-label={`Progresso ${building.progressPercent}%`}>
        <span style={{ width: `${building.progressPercent}%` }} />
      </div>
      <span className="city-progress-label">
        {building.progressPercent}% do progresso conceitual
      </span>

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

      {building.hasAction && building.route ? (
        <a className="button button-secondary city-card-action" href={building.route}>
          {building.actionLabel ?? "Abrir area relacionada"}
        </a>
      ) : null}

      <p className="city-educational-message">{building.educationalMessage}</p>
    </article>
  );
}

function getBuildingStatusLabel(status: CityBuildingViewModel["status"]): string {
  if (status === "locked") {
    return "Bloqueado";
  }

  if (status === "started") {
    return "Primeiros passos";
  }

  if (status === "growing") {
    return "Em desenvolvimento";
  }

  return "Consolidado";
}
