import { formatMoney } from "../../financial/money.js";
import type { Position } from "../../services/types.js";
import { AssetClassBadge } from "./Badges.js";

export function PositionCard({ position }: { position: Position }) {
  return (
    <article className="item-card">
      <div className="card-topline">
        <strong>{position.symbol}</strong>
        <AssetClassBadge value={position.assetClass} />
      </div>
      <h3>{position.name}</h3>
      <dl className="data-grid">
        <div>
          <dt>Quantidade</dt>
          <dd>{position.quantity}</dd>
        </div>
        <div>
          <dt>Preco medio</dt>
          <dd>{formatMoney(position.averagePriceCents)}</dd>
        </div>
        <div>
          <dt>Valor atual</dt>
          <dd>{formatMoney(position.marketValueCents)}</dd>
        </div>
        <div>
          <dt>Rendimentos</dt>
          <dd>{formatMoney(position.accumulatedIncomeCents)}</dd>
        </div>
      </dl>
    </article>
  );
}
