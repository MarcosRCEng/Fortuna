import type { MentorMessage } from "../types/player.js";

export function MentorTipCard({
  message,
  tip,
  onMarkAsRead,
}: {
  message?: MentorMessage | null;
  tip: string;
  onMarkAsRead?(): void;
}) {
  const severityLabel = message
    ? {
        positive: "Avanco",
        info: "Orientacao",
        warning: "Atencao",
        critical_educational: "Importante",
      }[message.severity]
    : "Orientacao";

  return (
    <section className={`panel mentor-card mentor-card-${message?.severity ?? "info"}`}>
      <div className="section-heading">
        <div>
          <span className="section-kicker">Mentor Fortuna</span>
          <h2>{message?.title ?? "Dica educativa"}</h2>
        </div>
        <span className="mentor-severity">{severityLabel}</span>
      </div>
      <p>{message?.message ?? tip}</p>
      {message?.educationalConcept ? (
        <p className="mentor-concept">Conceito: {message.educationalConcept}</p>
      ) : null}
      {message?.createdAt ? (
        <p className="educational-note">
          {new Date(message.createdAt).toLocaleDateString("pt-BR")}
        </p>
      ) : null}
      {message && !message.readAt && onMarkAsRead ? (
        <button
          type="button"
          className="button button-secondary"
          onClick={onMarkAsRead}
        >
          Marcar como lida
        </button>
      ) : null}
      <p className="educational-note">
        Esta e uma simulacao educacional. O objetivo e aprender sobre risco,
        liquidez, diversificacao e renda.
      </p>
    </section>
  );
}
