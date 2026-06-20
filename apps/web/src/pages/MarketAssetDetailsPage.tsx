import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState.js";
import { ErrorState } from "../components/ErrorState.js";
import { LoadingState } from "../components/LoadingState.js";
import { MarketAssetEducation } from "../components/MarketAssetEducation.js";
import { getMarketAssetDetail } from "../services/marketAssetDetailsApi.js";
import { simulateBuyAsset, type BuySimulation } from "../services/orderApi.js";
import {
  addWatchlistItem,
  removeWatchlistItem,
} from "../services/watchlistApi.js";
import type { Asset } from "../types/asset.js";
import type { MarketAssetDetail } from "../types/market.js";
import { formatDateTime } from "../utils/formatters.js";
import {
  formatBasisPoints,
  formatMoneyFromCents,
  parsePositiveWholeQuantity,
} from "../utils/money.js";
import {
  EducationalTrendPanel,
} from "./MarketPage.js";
import { formatChangePercent, marketTypeLabel } from "./marketPageModel.js";

export function MarketAssetDetailsPage({
  symbol,
  returnSearch,
  submitting,
  onBackToMarket,
  onBuy,
}: {
  symbol: string;
  returnSearch: string;
  submitting: boolean;
  onBackToMarket(): void;
  onBuy(asset: Asset, quantity: number): void;
}) {
  const [detail, setDetail] = useState<MarketAssetDetail>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [watchlistError, setWatchlistError] = useState<string>();
  const [watchlistSubmitting, setWatchlistSubmitting] = useState(false);
  const [quantityInput, setQuantityInput] = useState("1");
  const [simulation, setSimulation] = useState<BuySimulation>();
  const [simulationError, setSimulationError] = useState<string>();
  const [simulating, setSimulating] = useState(false);

  const loadDetail = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(undefined);
      try {
        setDetail(await getMarketAssetDetail(symbol, signal));
      } catch (caught) {
        if (signal?.aborted) {
          return;
        }
        setError(
          caught instanceof Error
            ? caught.message
            : "Nao foi possivel carregar o detalhe do ativo.",
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [symbol],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadDetail(controller.signal);
    return () => controller.abort();
  }, [loadDetail]);

  useEffect(() => {
    setSimulation(undefined);
    setSimulationError(undefined);
  }, [quantityInput, symbol]);

  const quantity = parsePositiveWholeQuantity(quantityInput);
  const asset = useMemo(() => (detail ? detailToAsset(detail) : undefined), [detail]);
  const simulationMatches = Boolean(
    simulation &&
      simulation.symbol === detail?.asset.symbol &&
      simulation.quantity === quantity,
  );
  const canContinue =
    Boolean(asset) &&
    Boolean(simulationMatches) &&
    Boolean(simulation?.canProceed) &&
    !submitting;

  async function handleToggleWatchlist() {
    if (!detail) {
      return;
    }
    const wasFavorite = detail.watchlist.inWatchlist;
    setWatchlistError(undefined);
    setWatchlistSubmitting(true);
    setDetail({ ...detail, watchlist: { inWatchlist: !wasFavorite } });
    try {
      const nextWatchlist = wasFavorite
        ? await removeWatchlistItem(detail.asset.symbol)
        : await addWatchlistItem(detail.asset.symbol);
      const inWatchlist = nextWatchlist.items.some(
        (item) => item.symbol === detail.asset.symbol,
      );
      setDetail((current) =>
        current ? { ...current, watchlist: { inWatchlist } } : current,
      );
    } catch (caught) {
      setDetail((current) =>
        current
          ? { ...current, watchlist: { inWatchlist: wasFavorite } }
          : current,
      );
      setWatchlistError(
        caught instanceof Error
          ? caught.message
          : "Nao foi possivel atualizar a watchlist.",
      );
    } finally {
      setWatchlistSubmitting(false);
    }
  }

  async function handleSimulate() {
    if (!detail || quantity <= 0) {
      setSimulation(undefined);
      setSimulationError("Informe uma quantidade inteira maior que zero.");
      return;
    }
    setSimulating(true);
    setSimulation(undefined);
    setSimulationError(undefined);
    try {
      setSimulation(await simulateBuyAsset(detail.asset.symbol, quantity));
    } catch (caught) {
      setSimulationError(
        caught instanceof Error
          ? caught.message
          : "Nao foi possivel simular esta compra.",
      );
    } finally {
      setSimulating(false);
    }
  }

  if (loading && !detail) {
    return <LoadingState message="Carregando detalhe do ativo..." />;
  }

  if (error && !detail) {
    return <ErrorState message={error} onRetry={() => void loadDetail()} />;
  }

  if (!detail || !asset) {
    return (
      <EmptyState
        title="Ativo nao encontrado"
        description="Volte ao catalogo para escolher outro ativo."
        action={
          <button
            type="button"
            className="button button-ghost"
            onClick={onBackToMarket}
          >
            Voltar ao mercado
          </button>
        }
      />
    );
  }

  return (
    <section className="asset-detail-page" aria-labelledby="asset-detail-title">
      <button
        type="button"
        className="button button-ghost asset-back-button"
        onClick={onBackToMarket}
      >
        Voltar ao mercado{returnSearch ? " com filtros" : ""}
      </button>
      {error ? <ErrorState message={error} onRetry={() => void loadDetail()} /> : null}
      {watchlistError ? <ErrorState message={watchlistError} /> : null}

      <AssetHeader
        detail={detail}
        watchlistSubmitting={watchlistSubmitting}
        onToggleWatchlist={() => void handleToggleWatchlist()}
      />

      <div className="asset-detail-grid">
        <PortfolioContext detail={detail} />
        <SimulationPanel
          detail={detail}
          quantityInput={quantityInput}
          simulation={simulationMatches ? simulation : undefined}
          simulationError={simulationError}
          simulating={simulating}
          canContinue={canContinue}
          submitting={submitting}
          onQuantityChange={setQuantityInput}
          onSimulate={() => void handleSimulate()}
          onContinue={() => onBuy(asset, quantity)}
        />
      </div>

      <MarketAssetEducation type={detail.asset.type} />

      {detail.trendError ? <ErrorState message={detail.trendError.message} /> : null}
      <EducationalTrendPanel
        symbol={detail.asset.symbol}
        trend={detail.trend ?? undefined}
        loading={false}
        onLoad={() => void loadDetail()}
      />
    </section>
  );
}

function AssetHeader({
  detail,
  watchlistSubmitting,
  onToggleWatchlist,
}: {
  detail: MarketAssetDetail;
  watchlistSubmitting: boolean;
  onToggleWatchlist(): void;
}) {
  const change = formatChangePercent(detail.quote.changePercent);
  const dataStateLabel = dataStateText(detail.provenance.dataState);
  return (
    <header className="asset-header">
      <div className="asset-header-title">
        <span className="section-kicker">Detalhe do ativo</span>
        <div>
          <h1 id="asset-detail-title">{detail.asset.symbol}</h1>
          <button
            type="button"
            className="favorite-button asset-watchlist-button"
            aria-label={
              detail.watchlist.inWatchlist
                ? `Remover ${detail.asset.symbol} da watchlist`
                : `Adicionar ${detail.asset.symbol} a watchlist`
            }
            aria-pressed={detail.watchlist.inWatchlist}
            disabled={watchlistSubmitting}
            onClick={onToggleWatchlist}
          >
            {detail.watchlist.inWatchlist ? "*" : "+"}
          </button>
        </div>
        <p>{detail.asset.name}</p>
      </div>

      <div className="asset-header-badges" aria-label="Classificacao do ativo">
        <span className="badge badge-neutral">
          {marketTypeLabel(detail.asset.type)}
        </span>
        {detail.asset.sector ? (
          <span className="badge badge-neutral">{detail.asset.sector}</span>
        ) : null}
        <span className={`badge data-kind-${detail.provenance.dataState.toLowerCase()}`}>
          {dataStateLabel}
        </span>
        <span className="badge badge-neutral">
          {detail.watchlist.inWatchlist ? "Na watchlist" : "Fora da watchlist"}
        </span>
      </div>

      <dl className="asset-header-metrics">
        <div>
          <dt>Preco atual</dt>
          <dd>{formatOptionalMoney(detail.quote.priceCents)}</dd>
        </div>
        <div>
          <dt>Variacao</dt>
          <dd className={`change-${change.tone}`}>{change.label}</dd>
        </div>
        <div>
          <dt>Referencia</dt>
          <dd>{formatOptionalDateTime(detail.quote.dataAsOf)}</dd>
        </div>
        <div>
          <dt>Origem dos dados</dt>
          <dd>
            <strong>{detail.provenance.source}</strong>
            <span>{detail.provenance.provider}</span>
          </dd>
        </div>
      </dl>

      <p className="asset-header-note">
        Atualizado em {formatDateTime(detail.provenance.fetchedAt)}. Dados de
        mercado sao educativos e podem ter atraso, cache ou fallback.
      </p>
    </header>
  );
}

function PortfolioContext({ detail }: { detail: MarketAssetDetail }) {
  if (!detail.position.inPortfolio) {
    return (
      <section className="asset-context-panel">
        <h2>Contexto da carteira</h2>
        <p className="educational-note">
          Este ativo ainda nao aparece na carteira simulada. Use a simulacao
          para observar impacto de saldo e concentracao antes de qualquer ordem.
        </p>
      </section>
    );
  }

  return (
    <section className="asset-context-panel">
      <h2>Contexto da carteira</h2>
      <dl className="asset-context-list">
        <div>
          <dt>Quantidade</dt>
          <dd>{detail.position.quantity}</dd>
        </div>
        <div>
          <dt>Custo medio</dt>
          <dd>{formatMoneyFromCents(detail.position.averagePriceCents)}</dd>
        </div>
        <div>
          <dt>Valor atual</dt>
          <dd>{formatMoneyFromCents(detail.position.currentValueCents)}</dd>
        </div>
        <div>
          <dt>Resultado simulado</dt>
          <dd>{formatMoneyFromCents(detail.position.unrealizedResultCents)}</dd>
        </div>
        <div>
          <dt>Participacao do ativo</dt>
          <dd>{detail.allocation.assetPercentageFormatted}</dd>
        </div>
        <div>
          <dt>Participacao da classe</dt>
          <dd>{detail.allocation.classPercentageFormatted}</dd>
        </div>
      </dl>
    </section>
  );
}

function SimulationPanel({
  detail,
  quantityInput,
  simulation,
  simulationError,
  simulating,
  canContinue,
  submitting,
  onQuantityChange,
  onSimulate,
  onContinue,
}: {
  detail: MarketAssetDetail;
  quantityInput: string;
  simulation?: BuySimulation;
  simulationError?: string;
  simulating: boolean;
  canContinue: boolean;
  submitting: boolean;
  onQuantityChange(value: string): void;
  onSimulate(): void;
  onContinue(): void;
}) {
  const quantity = parsePositiveWholeQuantity(quantityInput);
  const invalidQuantity = quantity <= 0;
  const canSimulate =
    detail.capabilities.canTradeInFortuna &&
    detail.quote.priceCents !== undefined &&
    !invalidQuantity &&
    !simulating;
  return (
    <section className="asset-simulation-panel">
      <h2>Simulacao pre-compra</h2>
      <label htmlFor="asset-simulation-quantity">
        Quantidade
        <input
          id="asset-simulation-quantity"
          inputMode="numeric"
          pattern="[0-9]*"
          value={quantityInput}
          onChange={(event) => onQuantityChange(event.target.value)}
        />
      </label>
      {invalidQuantity ? (
        <p className="form-error">Informe uma quantidade inteira maior que zero.</p>
      ) : null}
      {simulationError ? (
        <div className="state state-blocked" role="alert">
          <strong>Simulacao recusada</strong>
          <p>{simulationError}</p>
        </div>
      ) : null}
      {simulation ? <SimulationResult simulation={simulation} /> : null}
      <div className="asset-simulation-actions">
        <button
          type="button"
          className="button button-secondary"
          disabled={!canSimulate}
          onClick={onSimulate}
        >
          {simulating ? "Simulando..." : "Simular"}
        </button>
        <button
          type="button"
          className="button button-primary"
          disabled={!canContinue || submitting}
          onClick={onContinue}
        >
          Continuar para compra
        </button>
      </div>
      <p className="educational-note">
        Simular nao cria transacao, nao altera carteira, nao reserva saldo e
        nao substitui a validacao definitiva da ordem.
      </p>
    </section>
  );
}

function SimulationResult({ simulation }: { simulation: BuySimulation }) {
  return (
    <div className="simulation-result">
      <dl className="asset-context-list">
        <div>
          <dt>Preco unitario</dt>
          <dd>{formatMoneyFromCents(simulation.unitPriceCents)}</dd>
        </div>
        <div>
          <dt>Custo total</dt>
          <dd>{formatMoneyFromCents(simulation.totalCostCents)}</dd>
        </div>
        <div>
          <dt>Saldo atual</dt>
          <dd>{formatMoneyFromCents(simulation.currentBalanceCents)}</dd>
        </div>
        <div>
          <dt>Saldo projetado</dt>
          <dd>{formatMoneyFromCents(simulation.projectedBalanceCents)}</dd>
        </div>
        <div>
          <dt>Posicao projetada</dt>
          <dd>{simulation.projectedPosition.projectedQuantity}</dd>
        </div>
        <div>
          <dt>Ativo projetado</dt>
          <dd>{formatBasisPoints(simulation.concentration.projectedAssetBasisPoints)}</dd>
        </div>
        <div>
          <dt>Classe projetada</dt>
          <dd>
            {formatBasisPoints(simulation.concentration.projectedAssetTypeBasisPoints)}
          </dd>
        </div>
      </dl>
      {simulation.alerts.length > 0 ? (
        <div className="simulation-alerts" role="status">
          {simulation.alerts.map((alert) => (
            <p key={alert.code}>
              <strong>{alert.severity}</strong> {alert.message}
            </p>
          ))}
        </div>
      ) : (
        <p className="educational-note">
          Nenhum alerta educativo de concentracao para esta quantidade.
        </p>
      )}
    </div>
  );
}

function detailToAsset(detail: MarketAssetDetail): Asset {
  return {
    id: detail.asset.symbol,
    symbol: detail.asset.symbol,
    name: detail.asset.name,
    type: detail.asset.type,
    currentPriceCents: detail.quote.priceCents ?? 0,
    variationBps:
      typeof detail.quote.changePercent === "number"
        ? Math.round(detail.quote.changePercent * 100)
        : 0,
    riskLevel: "NONE",
    liquidity: "SIMULATED",
    description: detail.asset.sector
      ? `Catalogo de mercado - setor ${detail.asset.sector}.`
      : "Catalogo de mercado.",
    isActive: detail.asset.tradableInFortuna,
    isMocked: detail.provenance.dataState !== "REAL",
    updatedAt: detail.provenance.fetchedAt,
  };
}

function formatOptionalMoney(valueCents?: number): string {
  return Number.isInteger(valueCents)
    ? formatMoneyFromCents(valueCents as number)
    : "Preco indisponivel";
}

function formatOptionalDateTime(value?: string | null): string {
  return value ? formatDateTime(value) : "Referencia indisponivel";
}

function dataStateText(kind: MarketAssetDetail["provenance"]["dataState"]): string {
  const labels: Record<MarketAssetDetail["provenance"]["dataState"], string> = {
    REAL: "Dado real",
    MOCK: "Dado mock",
    CACHE: "Dado em cache",
    FALLBACK: "Dado fallback",
  };
  return labels[kind];
}
