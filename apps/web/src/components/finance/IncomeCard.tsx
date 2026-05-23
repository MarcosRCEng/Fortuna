import { formatMoney } from "../../financial/money.js";
import type { IncomeEvent } from "../../services/types.js";

export function IncomeCard({
  income,
  onCollect,
}: {
  income: IncomeEvent;
  onCollect(id: string): void;
}) {
  const isAvailable = income.status === "AVAILABLE";

  return (
    <article className="item-card">
      <div className="card-topline">
        <strong>{income.symbol}</strong>
        <span className={`badge ${isAvailable ? "badge-success" : "badge-neutral"}`}>
          {isAvailable ? "Disponivel" : "Recebido"}
        </span>
      </div>
      <h3>{income.assetName}</h3>
      <p>{income.explanation}</p>
      <div className="price-row">
        <span>{formatMoney(income.amountCents)}</span>
        <small>{income.source}</small>
      </div>
      <button
        type="button"
        className="button button-secondary"
        disabled={!isAvailable}
        onClick={() => onCollect(income.id)}
      >
        Colher rendimento
      </button>
    </article>
  );
}
