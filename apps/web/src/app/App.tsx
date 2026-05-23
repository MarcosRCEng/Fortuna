import { useEffect, useState, type ReactNode } from "react";
import { CitySummaryPanel } from "../components/education/CitySummaryPanel.js";
import { MentorPanel } from "../components/education/MentorPanel.js";
import { MissionCard } from "../components/education/MissionCard.js";
import { AssetCard } from "../components/finance/AssetCard.js";
import { AllocationChart } from "../components/finance/AllocationChart.js";
import {
  AssetClassBadge,
  LiquidityBadge,
  MarketStatusBadge,
  MockDataBadge,
  RiskBadge,
} from "../components/finance/Badges.js";
import { IncomeCard } from "../components/finance/IncomeCard.js";
import { PositionCard } from "../components/finance/PositionCard.js";
import {
  BalanceCard,
  EquityCard,
  InvestedCard,
} from "../components/finance/SummaryCards.js";
import { ConfirmationModal } from "../components/feedback/ConfirmationModal.js";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  OperationBlockedState,
  SuccessState,
} from "../components/feedback/States.js";
import { AppLayout, type ScreenKey } from "../components/layout/AppLayout.js";
import { FortunaCity } from "../features/city/components/FortunaCity.js";
import { createCitySnapshotFromOverview } from "../features/city/domain/citySnapshotAdapter.js";
import {
  calculateBalanceAfterBuy,
  calculateBalanceAfterSell,
  calculateTradeTotalCents,
  formatBasisPoints,
  formatMoney,
  parseWholeQuantity,
} from "../financial/money.js";
import {
  validateBuyOperation,
  validateSellOperation,
} from "../financial/operationValidation.js";
import { fortunaFinancialService } from "../services/mockFortunaFinancialService.js";
import type {
  Asset,
  PlayerOverview,
  Position,
  Transaction,
} from "../services/types.js";

type TradeMode = "buy" | "sell";

export function App() {
  const [overview, setOverview] = useState<PlayerOverview>();
  const [activeScreen, setActiveScreen] = useState<ScreenKey>("dashboard");
  const [selectedAsset, setSelectedAsset] = useState<Asset>();
  const [tradeMode, setTradeMode] = useState<TradeMode>("buy");
  const [quantityInput, setQuantityInput] = useState("1");
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  async function refreshOverview() {
    const next = await fortunaFinancialService.getOverview();
    setOverview(next);
  }

  useEffect(() => {
    refreshOverview()
      .catch(() =>
        setError(
          "Nao foi possivel carregar a UI financeira. Tente novamente em instantes.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingState message="Carregando carteira, ativos e Mentor Fortuna..." />;
  }

  if (!overview) {
    return (
      <ErrorState
        title="Dados indisponiveis"
        message={error ?? "A base financeira nao retornou dados para a interface."}
      />
    );
  }

  const openAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setActiveScreen("assets");
    setQuantityInput("1");
    setError(undefined);
    setSuccess(undefined);
  };

  const runTrade = async () => {
    if (!selectedAsset) {
      return;
    }

    setSubmitting(true);
    setError(undefined);
    setSuccess(undefined);

    try {
      const quantity = parseWholeQuantity(quantityInput);
      const result =
        tradeMode === "buy"
          ? await fortunaFinancialService.buyAsset({
              symbol: selectedAsset.symbol,
              quantity,
            })
          : await fortunaFinancialService.sellAsset({
              symbol: selectedAsset.symbol,
              quantity,
            });
      await refreshOverview();
      setSuccess(result.message);
      setConfirming(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "A operacao foi recusada pela validacao final.",
      );
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  };

  const collectIncome = async (incomeEventId: string) => {
    setSubmitting(true);
    setError(undefined);
    setSuccess(undefined);

    try {
      const result = await fortunaFinancialService.collectIncome(incomeEventId);
      await refreshOverview();
      setSuccess(result.message);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Nao foi possivel colher este rendimento.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout activeScreen={activeScreen} onNavigate={setActiveScreen}>
      {success ? <SuccessState message={success} /> : null}
      {error ? (
        <ErrorState title="Ajuste necessario" message={error} />
      ) : null}

      {activeScreen === "dashboard" ? (
        <DashboardScreen overview={overview} onOpenAsset={openAsset} />
      ) : null}
      {activeScreen === "wallet" ? <WalletScreen overview={overview} /> : null}
      {activeScreen === "assets" ? (
        <AssetsScreen
          overview={overview}
          selectedAsset={selectedAsset}
          tradeMode={tradeMode}
          quantityInput={quantityInput}
          submitting={submitting}
          onSelectAsset={openAsset}
          onTradeModeChange={setTradeMode}
          onQuantityChange={setQuantityInput}
          onConfirm={() => setConfirming(true)}
        />
      ) : null}
      {activeScreen === "income" ? (
        <IncomeScreen
          overview={overview}
          submitting={submitting}
          onCollect={collectIncome}
        />
      ) : null}
      {activeScreen === "history" ? (
        <HistoryScreen transactions={overview.transactions} />
      ) : null}
      {activeScreen === "missions" ? (
        <GridScreen
          kicker="Missoes educativas"
          title="Aprendizado com progresso claro"
        >
          {overview.missions.map((mission) => (
            <MissionCard key={mission.id} mission={mission} />
          ))}
        </GridScreen>
      ) : null}
      {activeScreen === "mentor" ? (
        <MentorPanel tips={overview.mentorTips} />
      ) : null}
      {activeScreen === "city" ? (
        <FortunaCity snapshot={createCitySnapshotFromOverview(overview)} />
      ) : null}

      {confirming && selectedAsset ? (
        <TradeConfirmationModal
          asset={selectedAsset}
          overview={overview}
          mode={tradeMode}
          quantity={parseWholeQuantity(quantityInput)}
          submitting={submitting}
          onCancel={() => setConfirming(false)}
          onConfirm={runTrade}
        />
      ) : null}
    </AppLayout>
  );
}

function DashboardScreen({
  overview,
  onOpenAsset,
}: {
  overview: PlayerOverview;
  onOpenAsset(asset: Asset): void;
}) {
  return (
    <>
      <Header
        kicker="Dashboard financeiro"
        title={`Ola, ${overview.playerName}`}
        description="Acompanhe saldo, patrimonio, missoes e orientacoes sem tratar variacao simulada como recomendacao real."
        action={<MarketStatusBadge updating={overview.marketUpdating} />}
      />
      <section className="metric-grid">
        <BalanceCard wallet={overview.wallet} />
        <EquityCard wallet={overview.wallet} />
        <InvestedCard wallet={overview.wallet} />
      </section>
      <section className="dashboard-grid">
        <AllocationChart
          positions={overview.wallet.positions}
          cashCents={overview.wallet.availableBalanceCents}
        />
        <MentorPanel tips={overview.mentorTips.slice(0, 2)} />
        <CitySummaryPanel city={overview.city} />
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Proximas missoes</span>
              <h2>Passos sugeridos</h2>
            </div>
          </div>
          <div className="stack">
            {overview.missions.slice(0, 2).map((mission) => (
              <MissionCard key={mission.id} mission={mission} />
            ))}
          </div>
        </section>
        <GridScreen kicker="Ativos em destaque" title="Catalogo simulado">
          {overview.assets.slice(0, 2).map((asset) => (
            <AssetCard key={asset.id} asset={asset} onSelect={onOpenAsset} />
          ))}
        </GridScreen>
      </section>
    </>
  );
}

function WalletScreen({ overview }: { overview: PlayerOverview }) {
  return (
    <>
      <Header
        kicker="Carteira"
        title="Posicoes, patrimonio e diversificacao"
        description="Valores atuais sao estimativas simuladas do MVP. O historico ajuda a entender decisoes, nao a perseguir resultado de curto prazo."
      />
      <section className="metric-grid">
        <BalanceCard wallet={overview.wallet} />
        <EquityCard wallet={overview.wallet} />
        <InvestedCard wallet={overview.wallet} />
      </section>
      <div className="two-column">
        <AllocationChart
          positions={overview.wallet.positions}
          cashCents={overview.wallet.availableBalanceCents}
        />
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Posicoes</span>
              <h2>Ativos na carteira</h2>
            </div>
          </div>
          {overview.wallet.positions.length === 0 ? (
            <EmptyState
              title="Carteira sem ativos"
              message="Quando comprar um ativo, ele aparecera aqui com quantidade, valor atual e classe."
            />
          ) : (
            <div className="stack">
              {overview.wallet.positions.map((position) => (
                <PositionCard key={position.symbol} position={position} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function AssetsScreen({
  overview,
  selectedAsset,
  tradeMode,
  quantityInput,
  submitting,
  onSelectAsset,
  onTradeModeChange,
  onQuantityChange,
  onConfirm,
}: {
  overview: PlayerOverview;
  selectedAsset?: Asset;
  tradeMode: TradeMode;
  quantityInput: string;
  submitting: boolean;
  onSelectAsset(asset: Asset): void;
  onTradeModeChange(mode: TradeMode): void;
  onQuantityChange(value: string): void;
  onConfirm(): void;
}) {
  return (
    <>
      <Header
        kicker="Lista de ativos"
        title="Ativos disponiveis no MVP"
        description="Todos os precos sao mockados e servem para educacao financeira dentro do jogo."
        action={<MockDataBadge />}
      />
      <div className="two-column">
        <GridScreen kicker="Catalogo" title="Escolha um ativo para estudar">
          {overview.assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} onSelect={onSelectAsset} />
          ))}
        </GridScreen>
        {selectedAsset ? (
          <AssetDetailPanel
            asset={selectedAsset}
            overview={overview}
            tradeMode={tradeMode}
            quantityInput={quantityInput}
            submitting={submitting}
            onTradeModeChange={onTradeModeChange}
            onQuantityChange={onQuantityChange}
            onConfirm={onConfirm}
          />
        ) : (
          <EmptyState
            title="Nenhum ativo selecionado"
            message="Abra o detalhe de um ativo para ver risco, liquidez, regras de rendimento e operacoes disponiveis."
          />
        )}
      </div>
    </>
  );
}

function AssetDetailPanel({
  asset,
  overview,
  tradeMode,
  quantityInput,
  submitting,
  onTradeModeChange,
  onQuantityChange,
  onConfirm,
}: {
  asset: Asset;
  overview: PlayerOverview;
  tradeMode: TradeMode;
  quantityInput: string;
  submitting: boolean;
  onTradeModeChange(mode: TradeMode): void;
  onQuantityChange(value: string): void;
  onConfirm(): void;
}) {
  const quantity = parseWholeQuantity(quantityInput);
  const position = overview.wallet.positions.find(
    (candidate) => candidate.symbol === asset.symbol,
  );
  const totalCents = calculateTradeTotalCents(asset.currentPriceCents, quantity);
  const validation =
    tradeMode === "buy"
      ? validateBuyOperation({
          asset,
          availableBalanceCents: overview.wallet.availableBalanceCents,
          quantity,
          marketUpdating: overview.marketUpdating,
        })
      : validateSellOperation({
          asset,
          position,
          quantity,
          marketUpdating: overview.marketUpdating,
        });

  return (
    <section className="panel sticky-panel">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Detalhe do ativo</span>
          <h2>{asset.name}</h2>
        </div>
        <strong>{asset.symbol}</strong>
      </div>
      <p>{asset.detail.longDescription}</p>
      <div className="badge-row">
        <AssetClassBadge value={asset.assetClass} />
        <RiskBadge value={asset.riskLevel} />
        <LiquidityBadge value={asset.liquidity} />
        <MockDataBadge />
      </div>
      <dl className="data-grid">
        <div>
          <dt>Preco atual</dt>
          <dd>{formatMoney(asset.currentPriceCents)}</dd>
        </div>
        <div>
          <dt>Variacao simulada</dt>
          <dd>{formatBasisPoints(asset.variationBps)}</dd>
        </div>
        <div>
          <dt>Posicao atual</dt>
          <dd>{position ? position.quantity : 0}</dd>
        </div>
        <div>
          <dt>Saldo disponivel</dt>
          <dd>{formatMoney(overview.wallet.availableBalanceCents)}</dd>
        </div>
      </dl>
      <div className="learning-box">
        <strong>Risco</strong>
        <p>{asset.detail.riskExplanation}</p>
        <strong>Liquidez</strong>
        <p>{asset.detail.liquidityExplanation}</p>
        <strong>Rendimento</strong>
        <p>{asset.yieldRules}</p>
        <strong>Mentor</strong>
        <p>{asset.detail.mentorHint}</p>
      </div>
      <div className="trade-box">
        <div className="segmented-control" aria-label="Tipo de operacao">
          <button
            type="button"
            className={tradeMode === "buy" ? "active" : ""}
            onClick={() => onTradeModeChange("buy")}
          >
            Comprar
          </button>
          <button
            type="button"
            className={tradeMode === "sell" ? "active" : ""}
            onClick={() => onTradeModeChange("sell")}
          >
            Vender
          </button>
        </div>
        <label>
          Quantidade
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            value={quantityInput}
            onChange={(event) => onQuantityChange(event.target.value)}
          />
        </label>
        <dl className="data-grid">
          <div>
            <dt>Total estimado</dt>
            <dd>{formatMoney(totalCents)}</dd>
          </div>
          <div>
            <dt>
              {tradeMode === "buy" ? "Saldo apos compra" : "Saldo apos venda"}
            </dt>
            <dd>
              {formatMoney(
                tradeMode === "buy"
                  ? calculateBalanceAfterBuy(
                      overview.wallet.availableBalanceCents,
                      totalCents,
                    )
                  : calculateBalanceAfterSell(
                      overview.wallet.availableBalanceCents,
                      totalCents,
                    ),
              )}
            </dd>
          </div>
        </dl>
        {validation.blocked ? (
          <OperationBlockedState message={validation.reason ?? "Operacao invalida."} />
        ) : null}
        <button
          type="button"
          className="button button-primary"
          disabled={validation.blocked || submitting}
          onClick={onConfirm}
        >
          Revisar impacto
        </button>
      </div>
    </section>
  );
}

function TradeConfirmationModal({
  asset,
  overview,
  mode,
  quantity,
  submitting,
  onCancel,
  onConfirm,
}: {
  asset: Asset;
  overview: PlayerOverview;
  mode: TradeMode;
  quantity: number;
  submitting: boolean;
  onCancel(): void;
  onConfirm(): void;
}) {
  const position = overview.wallet.positions.find(
    (candidate) => candidate.symbol === asset.symbol,
  );
  const totalCents = calculateTradeTotalCents(asset.currentPriceCents, quantity);
  const balanceAfter =
    mode === "buy"
      ? calculateBalanceAfterBuy(overview.wallet.availableBalanceCents, totalCents)
      : calculateBalanceAfterSell(overview.wallet.availableBalanceCents, totalCents);
  const remainingPosition =
    mode === "sell" && position ? position.quantity - quantity : undefined;

  return (
    <ConfirmationModal
      title={mode === "buy" ? "Confirmar compra" : "Confirmar venda"}
      confirmLabel={mode === "buy" ? "Confirmar compra" : "Confirmar venda"}
      disabled={submitting}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <dl className="data-grid modal-summary">
        <div>
          <dt>Ativo</dt>
          <dd>{asset.name}</dd>
        </div>
        <div>
          <dt>Quantidade</dt>
          <dd>{quantity}</dd>
        </div>
        <div>
          <dt>Preco unitario</dt>
          <dd>{formatMoney(asset.currentPriceCents)}</dd>
        </div>
        <div>
          <dt>{mode === "buy" ? "Custo total" : "Valor estimado"}</dt>
          <dd>{formatMoney(totalCents)}</dd>
        </div>
        <div>
          <dt>Saldo estimado apos operacao</dt>
          <dd>{formatMoney(balanceAfter)}</dd>
        </div>
        {remainingPosition !== undefined ? (
          <div>
            <dt>Posicao restante</dt>
            <dd>{remainingPosition}</dd>
          </div>
        ) : null}
      </dl>
      <p className="educational-note">
        A UI faz uma checagem preventiva, mas a validacao final pertence ao
        backend/dominio financeiro. Esta operacao gera historico se for aceita.
      </p>
    </ConfirmationModal>
  );
}

function IncomeScreen({
  overview,
  submitting,
  onCollect,
}: {
  overview: PlayerOverview;
  submitting: boolean;
  onCollect(id: string): void;
}) {
  return (
    <>
      <Header
        kicker="Rendimentos"
        title="Renda passiva simulada"
        description="Colher rendimentos mostra recorrencia no jogo, sem prometer retorno real ou garantido."
      />
      <GridScreen kicker="Eventos" title="Rendimentos disponiveis e recebidos">
        {overview.incomes.length === 0 ? (
          <EmptyState
            title="Sem rendimentos"
            message="Quando ativos simulados gerarem renda, os eventos aparecerao aqui com origem e explicacao."
          />
        ) : (
          overview.incomes.map((income) => (
            <IncomeCard
              key={income.id}
              income={income}
              onCollect={submitting ? () => undefined : onCollect}
            />
          ))
        )}
      </GridScreen>
    </>
  );
}

function HistoryScreen({ transactions }: { transactions: Transaction[] }) {
  return (
    <>
      <Header
        kicker="Historico"
        title="Timeline de transacoes e eventos"
        description="Cada operacao aceita pelo dominio gera historico para rastreabilidade e aprendizado."
      />
      <section className="panel">
        {transactions.length === 0 ? (
          <EmptyState
            title="Sem historico"
            message="Compras, vendas, rendimentos e marcos educativos aparecerao nesta timeline."
          />
        ) : (
          <ol className="timeline">
            {transactions.map((transaction) => (
              <li key={transaction.id}>
                <span>{transaction.type}</span>
                <div>
                  <strong>{transaction.description}</strong>
                  <p>
                    {transaction.symbol ? `${transaction.symbol} - ` : ""}
                    {formatMoney(transaction.totalCents)}
                    {transaction.quantity ? `, ${transaction.quantity} unidade(s)` : ""}
                  </p>
                  <small>
                    Saldo apos evento: {formatMoney(transaction.balanceAfterCents)}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

function GridScreen({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <span className="section-kicker">{kicker}</span>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="card-grid">{children}</div>
    </section>
  );
}

function Header({
  kicker,
  title,
  description,
  action,
}: {
  kicker: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <span className="section-kicker">{kicker}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
