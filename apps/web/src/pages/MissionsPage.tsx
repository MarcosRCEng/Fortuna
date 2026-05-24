import { EmptyState } from "../components/EmptyState.js";
import type { PlayerMission } from "../services/missionApi.js";

function statusLabel(status: PlayerMission["status"]) {
  const labels: Record<PlayerMission["status"], string> = {
    LOCKED: "Bloqueada",
    AVAILABLE: "Disponivel",
    IN_PROGRESS: "Em progresso",
    COMPLETED: "Concluida",
    CLAIMED: "Concluida",
  };
  return labels[status];
}

export function MissionsPage({ missions }: { missions: PlayerMission[] }) {
  return (
    <>
      <header className="page-header">
        <div>
          <span className="section-kicker">Missoes educativas</span>
          <h1>Aprenda conceitos financeiros jogando.</h1>
          <p>
            Cada missao acompanha uma acao real do MVP e registra progresso do
            jogador sem prometer ganho.
          </p>
        </div>
      </header>
      {missions.length === 0 ? (
        <EmptyState
          title="Missoes em preparacao"
          description="Crie ou carregue um jogador para inicializar as missoes educativas."
        />
      ) : (
        <section className="card-grid">
          {missions.map((mission) => {
            const progress =
              mission.targetValue === 0
                ? 0
                : Math.min(
                    100,
                    Math.round((mission.currentValue / mission.targetValue) * 100),
                  );
            const completed =
              mission.status === "COMPLETED" || mission.status === "CLAIMED";

            return (
              <article
                key={mission.id}
                className={`item-card mission-card ${completed ? "mission-done" : ""}`}
              >
                <div className="card-topline">
                  <strong>{statusLabel(mission.status)}</strong>
                  <span className={completed ? "badge badge-success" : "badge badge-neutral"}>
                    {progress}%
                  </span>
                </div>
                <h3>{mission.title}</h3>
                <p>{mission.description}</p>
                <small>{mission.objective}</small>
                <div className="progress-track" aria-label={`Progresso ${progress}%`}>
                  <span style={{ width: `${progress}%` }} />
                </div>
                <p className="educational-note">
                  {mission.educationalExplanation}
                </p>
                <div className="badge-row">
                  <span className="badge badge-neutral">
                    {mission.reward.label}
                  </span>
                  {mission.type === "RISK_ALERT" ? (
                    <span className="badge badge-warning">Alerta educativo</span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}
