import { AssetCard } from "../components/AssetCard.js";
import { EducationalDisclaimer } from "../components/EducationalDisclaimer.js";
import { EmptyState } from "../components/EmptyState.js";
import type { Asset } from "../types/asset.js";

export function MarketPage({
  assets,
  refreshing,
  onBuy,
  onViewEducation,
  onRefreshMarket,
}: {
  assets: Asset[];
  refreshing: boolean;
  onBuy(asset: Asset): void;
  onViewEducation(asset: Asset): void;
  onRefreshMarket(): void;
}) {
  return (
    <>
      <header className="page-header">
        <div>
          <span className="section-kicker">Mercado</span>
          <h1>Ativos para aprender risco, liquidez e renda.</h1>
          <p>
            Renda fixa, FIIs e acoes possuem comportamentos diferentes. Compare
            antes de decidir.
          </p>
        </div>
        <button
          type="button"
          className="button button-ghost"
          disabled={refreshing}
          onClick={onRefreshMarket}
        >
          Atualizar mercado
        </button>
      </header>
      <EducationalDisclaimer />
      <p className="educational-note">
        Atualizar mercado simula variacoes de preco para fins educacionais.
      </p>
      {assets.length === 0 ? (
        <EmptyState
          title="Nenhum ativo disponivel"
          description="Quando o backend retornar ativos, o catalogo do mercado aparecera aqui."
        />
      ) : (
        <section className="card-grid">
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onBuy={onBuy}
              onViewEducation={onViewEducation}
            />
          ))}
        </section>
      )}
    </>
  );
}
