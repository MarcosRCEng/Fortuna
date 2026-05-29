import type { Position } from "../types/wallet.js";
import { formatMoneyFromCents } from "../utils/money.js";
import { assetTypeLabel } from "../utils/risk.js";

export function PositionCard({
  position,
  disabled = false,
  onSell,
}: {
  position: Position;
  disabled?: boolean;
  onSell(position: Position): void;
}) {
  return (
    <article className="item-card">
      <div className="card-topline">
        <strong>{position.symbol}</strong>
        <span className="badge badge-neutral">
          {assetTypeLabel(position.assetType)}
        </span>
      </div>
      <h3>{position.name}</h3>
      <dl className="data-grid">
        <div>
          <dt>Quantidade</dt>
          <dd>{position.quantity}</dd>
        </div>
        <div>
          <dt>Preco medio</dt>
          <dd>{formatMoneyFromCents(position.averagePriceCents)}</dd>
        </div>
        <div>
          <dt>Preco atual</dt>
          <dd>{formatMoneyFromCents(position.currentPriceCents)}</dd>
        </div>
        <div>
          <dt>Valor atual</dt>
          <dd>{formatMoneyFromCents(position.currentValueCents)}</dd>
        </div>
        <div>
          <dt>Rendimento acumulado</dt>
          <dd>{formatMoneyFromCents(position.incomeCents ?? 0)}</dd>
        </div>
      </dl>
      <button
        type="button"
        className="button button-secondary"
        disabled={disabled}
        onClick={() => onSell(position)}
      >
        Vender
      </button>
    </article>
  );
}
