import type { Mission } from "../../services/types.js";

export function MissionCard({ mission }: { mission: Mission }) {
  const progress =
    mission.progressTarget === 0
      ? 0
      : Math.min(100, Math.round((mission.progressCurrent / mission.progressTarget) * 100));

  return (
    <article className="item-card mission-card">
      <div className="card-topline">
        <strong>{mission.status.replace("_", " ")}</strong>
        <span className="badge badge-neutral">{progress}%</span>
      </div>
      <h3>{mission.title}</h3>
      <p>{mission.description}</p>
      <small>{mission.objective}</small>
      <div className="progress-track" aria-label={`Progresso ${progress}%`}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <p className="educational-note">{mission.educationalExplanation}</p>
      <span className="reward-label">{mission.rewardLabel}</span>
    </article>
  );
}
