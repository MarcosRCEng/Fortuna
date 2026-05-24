import type { Asset } from "../types/asset.js";
import { formatBasisPoints, formatMoneyFromCents } from "../utils/money.js";
import { assetTypeLabel, riskLabel, riskTone } from "../utils/risk.js";

export function AssetCard({
  asset,
  onBuy,
}: {
  asset: Asset;
  onBuy(asset: Asset): void;
}) {
  return (
    <article className="item-card asset-card">
      <div className="card-topline">
        <strong>{asset.symbol}</strong>
        <span className="badge badge-neutral">{assetTypeLabel(asset.type)}</span>
      </div>
      <h3>{asset.name}</h3>
      <p>{asset.description}</p>
      <div className="badge-row">
        <span className={`badge ${riskTone(asset.riskLevel)}`}>
          {riskLabel(asset.riskLevel)}
        </span>
        <span className="badge badge-neutral">Liquidez {asset.liquidity}</span>
        {asset.isMocked ? <span className="badge badge-mock">Simulado</span> : null}
      </div>
      <dl className="data-grid">
        <div>
          <dt>Preco atual</dt>
          <dd>{formatMoneyFromCents(asset.currentPriceCents)}</dd>
        </div>
        <div>
          <dt>Variacao</dt>
          <dd>{formatBasisPoints(asset.variationBps)}</dd>
        </div>
        <div>
          <dt>Rendimento esperado</dt>
          <dd>
            {asset.expectedYieldCents
              ? formatMoneyFromCents(asset.expectedYieldCents)
              : asset.expectedYieldRateBps
                ? formatBasisPoints(asset.expectedYieldRateBps)
                : "Educativo"}
          </dd>
        </div>
      </dl>
      <p className="educational-note">
        {asset.expectedYieldDescription ??
          "Compare risco, liquidez e objetivo antes de decidir."}
      </p>
      <button
        type="button"
        className="button button-primary"
        disabled={!asset.isActive}
        onClick={() => onBuy(asset)}
      >
        Comprar
      </button>
    </article>
  );
}
