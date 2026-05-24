import { AllocationBar } from "../components/AllocationBar.js";
import { EmptyState } from "../components/EmptyState.js";
import { MentorTipCard } from "../components/MentorTipCard.js";
import { MetricCard } from "../components/MetricCard.js";
import type { PlayerSummary } from "../types/player.js";
import type { Portfolio, PortfolioAllocation } from "../types/wallet.js";
import { formatMoneyFromCents } from "../utils/money.js";

export function DashboardPage({
  summary,
  portfolio,
  allocation,
  collecting,
  onCreatePlayer,
  onGoToMarket,
  onCollectIncome,
  onMarkMentorMessageAsRead,
}: {
  summary?: PlayerSummary;
  portfolio?: Portfolio;
  allocation?: PortfolioAllocation;
  collecting: boolean;
  onCreatePlayer(): void;
  onGoToMarket(): void;
  onCollectIncome(): void;
  onMarkMentorMessageAsRead?(): void;
}) {
  if (!summary) {
    return (
      <EmptyState
        title="Comece sua jornada Fortuna"
        description="Crie um jogador para acompanhar saldo, carteira, rendimentos simulados e historico financeiro."
        action={
          <button type="button" className="button button-primary" onClick={onCreatePlayer}>
            Criar jogador
          </button>
        }
      />
    );
  }

  const hasPositions = (portfolio?.positions.length ?? 0) > 0;

  return (
    <>
      <header className="page-header">
        <div>
          <span className="section-kicker">Dashboard do jogador</span>
          <h1>Acompanhe sua evolucao financeira simulada.</h1>
          <p>
            Veja saldo, patrimonio, progresso e proximas decisoes sem transformar
            a simulacao em promessa de resultado.
          </p>
        </div>
        <button type="button" className="button button-primary" onClick={onGoToMarket}>
          Acessar mercado
        </button>
      </header>
      <section className="metric-grid">
        <MetricCard
          title="Saldo disponivel"
          value={formatMoneyFromCents(summary.availableCashCents)}
          description="Usado para compras. A API envia este valor em centavos."
        />
        <MetricCard
          title="Patrimonio total"
          value={formatMoneyFromCents(summary.totalEquityCents)}
          description="Saldo mais valor de mercado da carteira simulada."
        />
        <MetricCard
          title="Rendimento coletavel"
          value={
            summary.collectibleIncomeCents === null
              ? "Verificar"
              : formatMoneyFromCents(summary.collectibleIncomeCents)
          }
          description="A coleta e confirmada pelo backend antes de alterar saldo."
        />
        <MetricCard
          title={`Nivel ${summary.level}`}
          value={`${summary.progressPercent}%`}
          description="Progresso educativo baseado na atividade financeira."
        />
      </section>
      <div className="two-column">
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Carteira</span>
              <h2>Resumo visual</h2>
            </div>
          </div>
          <AllocationBar items={allocation?.byAssetType ?? []} />
          <p className="educational-note">
            Diversificar pode ajudar a reduzir concentracao, mas nao elimina
            riscos.
          </p>
        </section>
        <MentorTipCard
          tip={summary.mentorTip}
          message={summary.mentorMessage}
          onMarkAsRead={onMarkMentorMessageAsRead}
        />
      </div>
      <section className="panel action-panel">
        <div>
          <span className="section-kicker">Rendimentos</span>
          <h2>Fluxo de caixa simulado</h2>
          <p>
            Rendimentos simulados ajudam a entender fluxo de caixa, mas
            investimentos reais possuem regras, prazos e impostos.
          </p>
        </div>
        <button
          type="button"
          className="button button-secondary"
          disabled={collecting || !hasPositions}
          onClick={onCollectIncome}
        >
          Coletar rendimento
        </button>
      </section>
    </>
  );
}
