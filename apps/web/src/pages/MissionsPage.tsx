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

export function MissionsPage({
  missions,
  onGoToMarket,
  onGoToWallet,
  onCollectIncome,
  submitting = false,
}: {
  missions: PlayerMission[];
  onGoToMarket?: () => void;
  onGoToWallet?: () => void;
  onCollectIncome?: () => void;
  submitting?: boolean;
}) {
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
                <MissionAction
                  mission={mission}
                  disabled={submitting}
                  onGoToMarket={onGoToMarket}
                  onGoToWallet={onGoToWallet}
                  onCollectIncome={onCollectIncome}
                />
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}

function MissionAction({
  mission,
  disabled,
  onGoToMarket,
  onGoToWallet,
  onCollectIncome,
}: {
  mission: PlayerMission;
  disabled: boolean;
  onGoToMarket?: () => void;
  onGoToWallet?: () => void;
  onCollectIncome?: () => void;
}) {
  if (
    mission.status === "LOCKED" ||
    mission.status === "COMPLETED" ||
    mission.status === "CLAIMED"
  ) {
    return null;
  }

  const action = resolveMissionAction(mission, {
    onGoToMarket,
    onGoToWallet,
    onCollectIncome,
  });

  if (!action) {
    return null;
  }

  return (
    <button
      type="button"
      className="button button-secondary"
      disabled={disabled}
      onClick={action.onClick}
    >
      {action.label}
    </button>
  );
}

function resolveMissionAction(
  mission: PlayerMission,
  actions: {
    onGoToMarket?: () => void;
    onGoToWallet?: () => void;
    onCollectIncome?: () => void;
  },
) {
  const signal =
    `${mission.code} ${mission.type} ${mission.objective}`.toUpperCase();

  if (
    actions.onCollectIncome &&
    (signal.includes("INCOME") ||
      signal.includes("YIELD") ||
      signal.includes("RENDIMENTO"))
  ) {
    return { label: "Coletar rendimento", onClick: actions.onCollectIncome };
  }

  if (
    actions.onGoToWallet &&
    (signal.includes("PORTFOLIO") ||
      signal.includes("DIVERS") ||
      signal.includes("CONCENTRATION") ||
      signal.includes("CARTEIRA"))
  ) {
    return { label: "Ver carteira", onClick: actions.onGoToWallet };
  }

  if (
    actions.onGoToMarket &&
    (signal.includes("RISK") ||
      signal.includes("BUY") ||
      signal.includes("ASSET") ||
      signal.includes("MERCADO") ||
      signal.includes("RISCO"))
  ) {
    return { label: "Ir para o mercado", onClick: actions.onGoToMarket };
  }

  return actions.onGoToMarket
    ? { label: "Ir para o mercado", onClick: actions.onGoToMarket }
    : undefined;
}
