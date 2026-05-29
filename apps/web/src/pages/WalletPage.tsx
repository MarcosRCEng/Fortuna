import { AllocationBar } from "../components/AllocationBar.js";
import { EmptyState } from "../components/EmptyState.js";
import { MetricCard } from "../components/MetricCard.js";
import { PositionCard } from "../components/PositionCard.js";
import type { Position, Portfolio, PortfolioAllocation } from "../types/wallet.js";
import { formatMoneyFromCents } from "../utils/money.js";

export function WalletPage({
  availableCashCents,
  portfolio,
  allocation,
  submitting,
  onSell,
}: {
  availableCashCents: number;
  portfolio?: Portfolio;
  allocation?: PortfolioAllocation;
  submitting: boolean;
  onSell(position: Position): void;
}) {
  const positions = portfolio?.positions ?? [];

  return (
    <>
      <header className="page-header">
        <div>
          <span className="section-kicker">Carteira</span>
          <h1>Posicoes atuais e composicao.</h1>
          <p>
            Valores atuais sao estimativas simuladas do MVP. Use a tela para
            entender exposicao, preco medio e diversificacao.
          </p>
        </div>
      </header>
      <section className="metric-grid">
        <MetricCard
          title="Saldo disponivel"
          value={formatMoneyFromCents(availableCashCents)}
          description="Nao permitimos saldo negativo ou alavancagem no MVP."
        />
        <MetricCard
          title="Valor investido"
          value={formatMoneyFromCents(portfolio?.totalInvestedCents ?? 0)}
          description="Soma dos valores de compra das posicoes."
        />
        <MetricCard
          title="Valor atual"
          value={formatMoneyFromCents(portfolio?.totalMarketValueCents ?? 0)}
          description="Marcacao simulada com precos atuais."
        />
      </section>
      <div className="two-column">
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Alocacao</span>
              <h2>Por classe</h2>
            </div>
          </div>
          <AllocationBar items={allocation?.byAssetType ?? []} />
        </section>
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Posicoes</span>
              <h2>Ativos em carteira</h2>
            </div>
          </div>
          {positions.length === 0 ? (
            <EmptyState
              title="Carteira sem ativos"
              description="Depois da primeira compra, suas posicoes aparecerao aqui com quantidade, preco medio e valor atual."
            />
          ) : (
            <div className="stack">
              {positions.map((position) => (
                <PositionCard
                  key={position.assetId}
                  position={position}
                  disabled={submitting}
                  onSell={onSell}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
