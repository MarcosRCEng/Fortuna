import type { MentorTip } from "../../services/types.js";

export function MentorPanel({ tips }: { tips: MentorTip[] }) {
  return (
    <section className="panel mentor-panel">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Mentor Fortuna</span>
          <h2>Orientacao contextual</h2>
        </div>
      </div>
      <div className="stack">
        {tips.map((tip) => (
          <article className={`tip tip-${tip.severity.toLowerCase()}`} key={tip.id}>
            <strong>{tip.title}</strong>
            <p>{tip.message}</p>
            <span>{tip.concept}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
