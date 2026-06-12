import { useMemo, useState } from "react";
import type { EducationalTip } from "../cityEducationalTips.js";

const categoryLabels: Record<EducationalTip["category"], string> = {
  wallet: "Carteira",
  portfolio: "Portfolio",
  mission: "Missao",
  income: "Rendimento",
  risk: "Risco",
  city: "Cidade",
};

const severityLabels: Record<
  NonNullable<EducationalTip["severity"]>,
  string
> = {
  info: "Orientacao",
  success: "Pratica aberta",
  warning: "Atencao educativa",
};

export function CityEducationalTips({
  tips,
  maxVisible = 4,
  compact = false,
}: {
  tips: EducationalTip[];
  maxVisible?: number;
  compact?: boolean;
}) {
  const [dismissedTipIds, setDismissedTipIds] = useState<Set<string>>(
    () => new Set(),
  );
  const visibleTips = useMemo(
    () =>
      tips
        .filter((tip) => !dismissedTipIds.has(tip.id))
        .slice(0, Math.max(1, maxVisible)),
    [dismissedTipIds, maxVisible, tips],
  );

  if (tips.length === 0) {
    return null;
  }

  function dismissTip(tipId: string) {
    setDismissedTipIds((current) => new Set(current).add(tipId));
  }

  function restoreTips() {
    setDismissedTipIds(new Set());
  }

  return (
    <section
      className={`city-educational-tips${compact ? " city-educational-tips-compact" : ""}`}
      aria-label="Proximos passos educativos"
    >
      <div className="city-educational-tips-heading">
        <div>
          <span className="section-kicker">Guia DIY</span>
          <h2>Proximos passos</h2>
          <p>
            Dicas do simulador para escolher a proxima acao educativa, sem
            recomendacao financeira real.
          </p>
        </div>
        <span className="city-educational-tip-count">
          {visibleTips.length}/{tips.length}
        </span>
      </div>

      {visibleTips.length > 0 ? (
        <div className="city-educational-tip-list">
          {visibleTips.map((tip) => (
            <article
              key={tip.id}
              className={`city-educational-tip city-educational-tip-${tip.severity ?? "info"}`}
            >
              <div className="city-educational-tip-topline">
                <span>{categoryLabels[tip.category]}</span>
                <small>{severityLabels[tip.severity ?? "info"]}</small>
              </div>
              <h3>{tip.title}</h3>
              <p>{tip.description}</p>
              <div className="city-educational-tip-actions">
                {tip.actionHref && tip.actionLabel ? (
                  <a className="button button-secondary" href={tip.actionHref}>
                    {tip.actionLabel}
                  </a>
                ) : null}
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => dismissTip(tip.id)}
                >
                  Dispensar
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="city-educational-tips-empty">
          <p>Dicas dispensadas nesta sessao.</p>
          <button
            className="button button-ghost"
            type="button"
            onClick={restoreTips}
          >
            Mostrar novamente
          </button>
        </div>
      )}
    </section>
  );
}
