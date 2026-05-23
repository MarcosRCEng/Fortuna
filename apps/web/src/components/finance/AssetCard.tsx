import { formatBasisPoints, formatMoney } from "../../financial/money.js";
import type { Asset } from "../../services/types.js";
import {
  AssetClassBadge,
  LiquidityBadge,
  MockDataBadge,
  RiskBadge,
} from "./Badges.js";

export function AssetCard({
  asset,
  onSelect,
}: {
  asset: Asset;
  onSelect(asset: Asset): void;
}) {
  return (
    <article className="item-card asset-card">
      <div className="card-topline">
        <strong>{asset.symbol}</strong>
        <MockDataBadge />
      </div>
      <h3>{asset.name}</h3>
      <p>{asset.educationalDescription}</p>
      <div className="badge-row">
        <AssetClassBadge value={asset.assetClass} />
        <RiskBadge value={asset.riskLevel} />
        <LiquidityBadge value={asset.liquidity} />
      </div>
      <div className="price-row">
        <span>{formatMoney(asset.currentPriceCents)}</span>
        <small>{formatBasisPoints(asset.variationBps)}</small>
      </div>
      <button type="button" className="button button-secondary" onClick={() => onSelect(asset)}>
        Ver detalhes
      </button>
    </article>
  );
}
