import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { EmptyState } from "../components/EmptyState.js";
import { ErrorState } from "../components/ErrorState.js";
import { LoadingState } from "../components/LoadingState.js";
import { getMarketCatalog } from "../services/marketCatalogApi.js";
import { getMarketStatus } from "../services/marketStatusApi.js";
import {
  getEducationalTrend,
  getEducationalTrends,
} from "../services/educationalTrendApi.js";
import {
  addWatchlistItem,
  getWatchlist,
  removeWatchlistItem,
  updateWatchlistPreferences,
} from "../services/watchlistApi.js";
import type { Asset } from "../types/asset.js";
import type {
  MarketAssetType,
  MarketCatalogItem,
  MarketCatalogPage,
  MarketCatalogSortBy,
  MarketCatalogSortOrder,
  PlayerWatchlist,
  EducationalTrend,
  EducationalTrendFactor,
} from "../types/market.js";
import type { Portfolio } from "../types/wallet.js";
import {
  filterPersonalItems,
  formatChangePercent,
  formatOptionalMoney,
  groupTypeFilters,
  isCatalogView,
  mapCatalogItemToAsset,
  marketTypeLabel,
  positionToCatalogItem,
  defaultMarketCapabilities,
  shouldShowTreasuryPreparation,
  sortPersonalItems,
  typeOptionsForCapabilities,
  visibleGroupsForView,
  watchlistItemToCatalogItem,
  type MarketViewKey,
} from "./marketPageModel.js";

const marketTabs: Array<{ key: MarketViewKey; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "equities", label: "Acoes e Units" },
  { key: "fiis", label: "FIIs" },
  { key: "etfs", label: "ETFs" },
  { key: "listed-funds", label: "Outros fundos listados" },
  { key: "bdrs", label: "BDRs" },
  { key: "watchlist", label: "Minha lista" },
  { key: "portfolio", label: "Minha carteira" },
];

const sectorOptions = [
  "",
  "Financeiro",
  "Energia",
  "Materiais Basicos",
  "Consumo",
  "Logistica",
  "Indice",
  "Infraestrutura",
  "Agronegocio",
  "Participacoes",
  "Credito",
  "BDR",
];

const typeOptions = typeOptionsForCapabilities(defaultMarketCapabilities);

const sortOptions: Array<{ value: MarketCatalogSortBy; label: string }> = [
  { value: "name", label: "Nome" },
  { value: "price", label: "Preco" },
  { value: "changePercent", label: "Variacao" },
  { value: "volume", label: "Volume" },
  { value: "marketCap", label: "Valor de mercado" },
];

const TREND_BATCH_LIMIT = 5;

function initialSearchParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    tab: parseTab(params.get("tab")),
    search: params.get("q") ?? "",
    sector: params.get("sector") ?? "",
    type: parseType(params.get("type")),
    sortBy: parseSortBy(params.get("sortBy")),
    sortOrder: parseSortOrder(params.get("sortOrder")),
    page: parsePositiveInteger(params.get("page"), 1),
    pageSize: parsePositiveInteger(params.get("pageSize"), 12),
  };
}

export function MarketPage({
  portfolio,
  refreshing,
  submitting,
  onBuy,
  onOpenDetails,
  onRefreshMarket,
}: {
  portfolio?: Portfolio;
  refreshing: boolean;
  submitting: boolean;
  onBuy(asset: Asset): void;
  onViewEducation(asset: Asset): void;
  onOpenDetails(symbol: string): void;
  onRefreshMarket(): void;
}) {
  const initial = useMemo(() => initialSearchParams(), []);
  const [activeTab, setActiveTab] = useState<MarketViewKey>(initial.tab);
  const [searchInput, setSearchInput] = useState(initial.search);
  const [debouncedSearch, setDebouncedSearch] = useState(initial.search);
  const [sector, setSector] = useState(initial.sector);
  const [type, setType] = useState<"" | MarketAssetType>(initial.type);
  const [sortBy, setSortBy] = useState<MarketCatalogSortBy>(initial.sortBy);
  const [sortOrder, setSortOrder] = useState<MarketCatalogSortOrder>(
    initial.sortOrder,
  );
  const [page, setPage] = useState(initial.page);
  const [pageSize, setPageSize] = useState(initial.pageSize);
  const [catalog, setCatalog] = useState<MarketCatalogPage>();
  const [watchlist, setWatchlist] = useState<PlayerWatchlist>();
  const [capabilities, setCapabilities] = useState(defaultMarketCapabilities);
  const [favoriteSymbols, setFavoriteSymbols] = useState<Set<string>>(
    new Set(),
  );
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string>();
  const [watchlistError, setWatchlistError] = useState<string>();
  const [favoriteError, setFavoriteError] = useState<string>();
  const [trendBySymbol, setTrendBySymbol] = useState<
    Record<string, EducationalTrend>
  >({});
  const [trendLoadingSymbols, setTrendLoadingSymbols] = useState<Set<string>>(
    new Set(),
  );
  const [trendError, setTrendError] = useState<string>();
  const preferencesLoaded = useRef(false);
  const trendRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void getMarketStatus(controller.signal)
      .then((status) => setCapabilities(status.capabilities))
      .catch(() => {
        setCapabilities(defaultMarketCapabilities);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const loadWatchlist = useCallback(async () => {
    setWatchlistLoading(true);
    setWatchlistError(undefined);
    try {
      const nextWatchlist = await getWatchlist();
      setWatchlist(nextWatchlist);
      setFavoriteSymbols(
        new Set(nextWatchlist.items.map((item) => item.symbol)),
      );
      if (!preferencesLoaded.current) {
        preferencesLoaded.current = true;
        setSortOrder(nextWatchlist.preferences.sortOrder);
        if (
          nextWatchlist.preferences.sortBy === "name" ||
          nextWatchlist.preferences.sortBy === "price" ||
          nextWatchlist.preferences.sortBy === "changePercent"
        ) {
          setSortBy(nextWatchlist.preferences.sortBy);
        }
        if (nextWatchlist.preferences.maxItemsPerGroup) {
          setPageSize(nextWatchlist.preferences.maxItemsPerGroup);
        }
      }
    } catch (caught) {
      setWatchlistError(
        caught instanceof Error
          ? caught.message
          : "Nao foi possivel carregar sua lista.",
      );
    } finally {
      setWatchlistLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWatchlist();
  }, [loadWatchlist]);

  useEffect(() => {
    if (!isCatalogView(activeTab)) {
      return;
    }
    const controller = new AbortController();
    setCatalogLoading(true);
    setCatalogError(undefined);
    const types = resolveTypeFilters(activeTab, type);
    void getMarketCatalog(
      {
        search: debouncedSearch.trim() || undefined,
        types,
        sectors: sector ? [sector] : undefined,
        sortBy,
        sortOrder,
        page,
        pageSize,
      },
      controller.signal,
    )
      .then(setCatalog)
      .catch((caught) => {
        if (controller.signal.aborted) {
          return;
        }
        setCatalogError(
          caught instanceof Error
            ? caught.message
            : "Nao foi possivel carregar o catalogo.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCatalogLoading(false);
        }
      });
    return () => controller.abort();
  }, [
    activeTab,
    debouncedSearch,
    page,
    pageSize,
    sector,
    sortBy,
    sortOrder,
    type,
  ]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("tab", activeTab);
    if (searchInput.trim()) {
      params.set("q", searchInput.trim());
    }
    if (sector) {
      params.set("sector", sector);
    }
    if (type) {
      params.set("type", type);
    }
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    window.history.replaceState(null, "", `/market?${params.toString()}`);
  }, [activeTab, page, pageSize, searchInput, sector, sortBy, sortOrder, type]);

  useEffect(() => {
    if (!preferencesLoaded.current) {
      return;
    }
    const timeout = window.setTimeout(() => {
      void updateWatchlistPreferences({
        visibleGroups: visibleGroupsForView(activeTab),
        portfolioOnly: activeTab === "portfolio",
        sortBy:
          sortBy === "name" || sortBy === "price" || sortBy === "changePercent"
            ? sortBy
            : "symbol",
        sortOrder,
        maxItemsPerGroup: pageSize,
      })
        .then((nextWatchlist) => {
          setWatchlist(nextWatchlist);
          setFavoriteSymbols(
            new Set(nextWatchlist.items.map((item) => item.symbol)),
          );
        })
        .catch(() => {
          // Preferences are ergonomic, not blocking. Favoriting keeps explicit errors.
        });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [activeTab, pageSize, sortBy, sortOrder]);

  const personalItems = useMemo(() => {
    const source =
      activeTab === "watchlist"
        ? (watchlist?.items ?? []).map(watchlistItemToCatalogItem)
        : (portfolio?.positions ?? []).map(positionToCatalogItem);
    const filtered = filterPersonalItems(source, debouncedSearch, type, sector);
    const sorted = sortPersonalItems(filtered, sortBy, sortOrder);
    const start = (page - 1) * pageSize;
    return {
      all: sorted,
      pageItems: sorted.slice(start, start + pageSize),
      totalPages: sorted.length === 0 ? 0 : Math.ceil(sorted.length / pageSize),
    };
  }, [
    activeTab,
    debouncedSearch,
    page,
    pageSize,
    portfolio?.positions,
    sector,
    sortBy,
    sortOrder,
    type,
    watchlist?.items,
  ]);

  const items = isCatalogView(activeTab)
    ? (catalog?.items ?? [])
    : personalItems.pageItems;
  const totalItems = isCatalogView(activeTab)
    ? (catalog?.totalItems ?? 0)
    : personalItems.all.length;
  const totalPages = isCatalogView(activeTab)
    ? (catalog?.totalPages ?? 0)
    : personalItems.totalPages;
  const hasNextPage = isCatalogView(activeTab)
    ? Boolean(catalog?.hasNextPage)
    : page < personalItems.totalPages;
  const isLoading = catalogLoading || watchlistLoading;
  const isFallback = catalog?.source === "MOCK" || catalog?.source === "CACHE";
  const availableTypeOptions = typeOptionsForCapabilities(capabilities);
  const visibleTrendSymbols = useMemo(
    () => items.slice(0, TREND_BATCH_LIMIT).map((item) => item.symbol),
    [items],
  );

  useEffect(() => {
    return () => trendRequestRef.current?.abort();
  }, [activeTab, page, debouncedSearch, sector, type, sortBy, sortOrder]);

  function handleTabChange(nextTab: MarketViewKey) {
    setActiveTab(nextTab);
    setPage(1);
    setSearchInput("");
    setDebouncedSearch("");
    if (nextTab !== "bdrs") {
      setType("");
    }
  }

  function handleFilterChange(
    setter: (value: string) => void,
  ): (event: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => void {
    return (event) => {
      setter(event.target.value);
      setPage(1);
    };
  }

  async function handleFavorite(symbol: string) {
    const normalized = symbol.trim().toUpperCase();
    const wasFavorite = favoriteSymbols.has(normalized);
    setFavoriteError(undefined);
    setFavoriteSymbols((current) => {
      const next = new Set(current);
      if (wasFavorite) {
        next.delete(normalized);
      } else {
        next.add(normalized);
      }
      return next;
    });
    try {
      const nextWatchlist = wasFavorite
        ? await removeWatchlistItem(normalized)
        : await addWatchlistItem(normalized);
      setWatchlist(nextWatchlist);
      setFavoriteSymbols(
        new Set(nextWatchlist.items.map((item) => item.symbol)),
      );
    } catch (caught) {
      setFavoriteSymbols((current) => {
        const next = new Set(current);
        if (wasFavorite) {
          next.add(normalized);
        } else {
          next.delete(normalized);
        }
        return next;
      });
      setFavoriteError(
        caught instanceof Error
          ? caught.message
          : "Nao foi possivel atualizar o favorito.",
      );
    }
  }

  async function loadTrendsForSymbols(symbols: string[]) {
    const normalized = [
      ...new Set(
        symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean),
      ),
    ].slice(0, TREND_BATCH_LIMIT);
    if (normalized.length === 0) {
      return;
    }
    trendRequestRef.current?.abort();
    const controller = new AbortController();
    trendRequestRef.current = controller;
    setTrendError(undefined);
    setTrendLoadingSymbols((current) => new Set([...current, ...normalized]));
    try {
      const response =
        normalized.length === 1
          ? {
              items: [
                await getEducationalTrend(normalized[0]!, controller.signal),
              ],
            }
          : await getEducationalTrends(normalized, controller.signal);
      setTrendBySymbol((current) => {
        const next = { ...current };
        for (const trend of response.items) {
          next[trend.symbol] = trend;
        }
        return next;
      });
    } catch (caught) {
      if (controller.signal.aborted) {
        return;
      }
      setTrendError(
        caught instanceof Error
          ? caught.message
          : "Nao foi possivel carregar a tendencia educacional.",
      );
    } finally {
      if (!controller.signal.aborted) {
        setTrendLoadingSymbols((current) => {
          const next = new Set(current);
          for (const symbol of normalized) {
            next.delete(symbol);
          }
          return next;
        });
      }
    }
  }

  return (
    <>
      <header className="page-header market-page-header">
        <div>
          <span className="section-kicker">Mercados</span>
          <h1>Mercados</h1>
          <p>
            Explore o catalogo, acompanhe sua lista e compare ativos com dados
            educativos e status explicito.
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

      <section className="market-toolbar" aria-label="Filtros de mercado">
        <label htmlFor="market-search">
          Buscar por ticker ou nome
          <input
            id="market-search"
            type="search"
            placeholder="ITUB4, Petrobras, FII..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </label>
        <label htmlFor="market-sector">
          Setor
          <select
            id="market-sector"
            value={sector}
            onChange={handleFilterChange(setSector)}
          >
            {sectorOptions.map((option) => (
              <option key={option || "all"} value={option}>
                {option || "Todos os setores"}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="market-type">
          Tipo individual
          <select
            id="market-type"
            value={type}
            onChange={(event) => {
              setType(event.target.value as "" | MarketAssetType);
              setPage(1);
            }}
          >
            {availableTypeOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="market-sort">
          Ordenacao
          <select
            id="market-sort"
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value as MarketCatalogSortBy);
              setPage(1);
            }}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="market-sort-order">
          Direcao
          <select
            id="market-sort-order"
            value={sortOrder}
            onChange={(event) => {
              setSortOrder(event.target.value as MarketCatalogSortOrder);
              setPage(1);
            }}
          >
            <option value="asc">Crescente</option>
            <option value="desc">Decrescente</option>
          </select>
        </label>
        <label htmlFor="market-page-size">
          Itens por pagina
          <select
            id="market-page-size"
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number.parseInt(event.target.value, 10));
              setPage(1);
            }}
          >
            {[6, 12, 24, 48].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </section>

      <nav className="market-tabs" aria-label="Agrupamentos do mercado">
        {marketTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={tab.key === activeTab ? "active" : ""}
            aria-pressed={tab.key === activeTab}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className="market-status-row" aria-live="polite">
        <span>{totalItems} ativo(s) encontrados</span>
        {catalog?.delayed ? <span>Dado atrasado</span> : null}
        {isFallback ? (
          <span>Fallback {catalog?.source.toLowerCase()}</span>
        ) : null}
        {watchlistError ? <span>Watchlist indisponivel</span> : null}
        {!isCatalogView(activeTab) && items.length > 0 ? (
          <button
            type="button"
            className="button button-ghost"
            disabled={trendLoadingSymbols.size > 0}
            onClick={() => void loadTrendsForSymbols(visibleTrendSymbols)}
          >
            Carregar tendencias visiveis
          </button>
        ) : null}
      </section>

      {favoriteError ? <ErrorState message={favoriteError} /> : null}
      {catalogError ? <ErrorState message={catalogError} /> : null}
      {trendError ? <ErrorState message={trendError} /> : null}

      {shouldShowTreasuryPreparation(capabilities) ? (
        <section
          className="treasury-coming-soon"
          aria-label="Tesouro em preparacao"
        >
          <strong>Tesouro Direto preparado</strong>
          <span>
            Catalogo Pro disponivel apenas como leitura, sem operacoes
            financeiras.
          </span>
        </section>
      ) : null}

      {isLoading ? (
        <MarketSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhum ativo encontrado"
          description="Ajuste busca, filtros ou agrupamento para explorar outros resultados."
        />
      ) : (
        <section className="market-grid" aria-label="Ativos de mercado">
          {items.map((item) => (
            <MarketAssetCard
              key={item.symbol}
              item={item}
              favorite={favoriteSymbols.has(item.symbol)}
              disabled={submitting || refreshing}
              trend={trendBySymbol[item.symbol]}
              trendLoading={trendLoadingSymbols.has(item.symbol)}
              portfolioContext={
                activeTab === "portfolio"
                  ? portfolioContextForItem(item, portfolio)
                  : undefined
              }
              onFavorite={() => void handleFavorite(item.symbol)}
              onBuy={() => onBuy(mapCatalogItemToAsset(item))}
              onOpenDetails={() => onOpenDetails(item.symbol)}
              onLoadTrend={() => void loadTrendsForSymbols([item.symbol])}
            />
          ))}
        </section>
      )}

      <footer className="market-pagination" aria-label="Paginacao do mercado">
        <button
          type="button"
          className="button button-ghost"
          disabled={page <= 1 || isLoading}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Anterior
        </button>
        <span>
          Pagina {page} de {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          className="button button-ghost"
          disabled={!hasNextPage || isLoading}
          onClick={() => setPage((current) => current + 1)}
        >
          Proxima
        </button>
      </footer>
    </>
  );
}

export function MarketAssetCard({
  item,
  favorite,
  disabled,
  onFavorite,
  onBuy,
  onOpenDetails,
  onLoadTrend,
  trend,
  trendLoading,
  portfolioContext,
}: {
  item: MarketCatalogItem;
  favorite: boolean;
  disabled: boolean;
  trend?: EducationalTrend;
  trendLoading?: boolean;
  portfolioContext?: PortfolioConcentrationContext;
  onFavorite(): void;
  onBuy(): void;
  onOpenDetails(): void;
  onLoadTrend(): void;
}) {
  const change = formatChangePercent(item.changePercent);
  const canBuy = item.tradableInFortuna && item.priceCents !== undefined;
  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenDetails();
    }
  }
  return (
    <article
      className="market-asset-card market-asset-card-clickable"
      role="link"
      tabIndex={0}
      aria-label={`Abrir detalhe educativo de ${item.symbol}`}
      onClick={onOpenDetails}
      onKeyDown={handleCardKeyDown}
    >
      <div className="market-card-topline">
        <div>
          <strong>{item.symbol}</strong>
          <span>{marketTypeLabel(item.type)}</span>
        </div>
        <button
          type="button"
          className="favorite-button"
          aria-label={
            favorite
              ? `Remover ${item.symbol} da minha lista`
              : `Adicionar ${item.symbol} a minha lista`
          }
          aria-pressed={favorite}
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            onFavorite();
          }}
        >
          {favorite ? "★" : "☆"}
        </button>
      </div>
      <h2>{item.name}</h2>
      <div className="badge-row">
        <span className="badge badge-neutral">
          {marketTypeLabel(item.type)}
        </span>
        {item.sector ? (
          <span className="badge badge-neutral">{item.sector}</span>
        ) : null}
        {!item.tradableInFortuna ? (
          <span className="badge badge-warning">Somente catalogo</span>
        ) : null}
      </div>
      <dl className="market-card-data">
        <div>
          <dt>Preco</dt>
          <dd>{formatOptionalMoney(item.priceCents)}</dd>
        </div>
        <div>
          <dt>Variacao</dt>
          <dd className={`change-${change.tone}`}>{change.label}</dd>
        </div>
        <div>
          <dt>Volume</dt>
          <dd>{item.volume?.toLocaleString("pt-BR") ?? "Indisponivel"}</dd>
        </div>
      </dl>
      {item.priceCents === undefined ? (
        <p className="market-card-note">Cotacao indisponivel.</p>
      ) : null}
      <button
        type="button"
        className="button button-primary"
        disabled={disabled || !canBuy}
        onClick={(event) => {
          event.stopPropagation();
          onBuy();
        }}
      >
        Comprar
      </button>
      <div onClick={(event) => event.stopPropagation()}>
        <EducationalTrendPanel
          symbol={item.symbol}
          trend={trend}
          loading={Boolean(trendLoading)}
          portfolioContext={portfolioContext}
          onLoad={onLoadTrend}
        />
      </div>
    </article>
  );
}

export function EducationalTrendPanel({
  symbol,
  trend,
  loading,
  portfolioContext,
  onLoad,
}: {
  symbol: string;
  trend?: EducationalTrend;
  loading: boolean;
  portfolioContext?: PortfolioConcentrationContext;
  onLoad(): void;
}) {
  if (!trend) {
    return (
      <section className="educational-trend-card educational-trend-empty">
        <div>
          <strong>Tendencia educacional</strong>
          <p>
            Carregue o card do Mentor para ver sinais didaticos deste ativo.
          </p>
        </div>
        <button
          type="button"
          className="button button-ghost"
          disabled={loading}
          onClick={onLoad}
        >
          {loading ? "Carregando..." : "Ver tendencia"}
        </button>
      </section>
    );
  }

  const label = trendClassificationLabel(trend.classification);
  const scorePercent = Math.max(
    0,
    Math.min(100, ((trend.score + 100) / 200) * 100),
  );
  const positiveFactors = trend.factors.filter(
    (factor) => factor.impact === "POSITIVE",
  );
  const neutralFactors = trend.factors.filter(
    (factor) => factor.impact === "NEUTRAL",
  );
  const attentionFactors = trend.factors.filter(
    (factor) => factor.impact === "NEGATIVE",
  );
  const insufficient = trend.classification === "DADOS_INSUFICIENTES";

  return (
    <section
      className={`educational-trend-card trend-${trendTone(trend.classification)}`}
    >
      <div className="educational-trend-heading">
        <div>
          <strong>Tendencia educacional</strong>
          <span>{symbol}</span>
        </div>
        <span className="mentor-severity">{label}</span>
      </div>

      {insufficient ? (
        <p className="educational-note">
          Dados insuficientes para calcular a escala. O Mentor mostra os motivos
          sem inventar score ou conclusao.
        </p>
      ) : null}

      <div
        className="educational-trend-scale"
        aria-label={`Score ${trend.score} em escala de Muito negativo a Muito positivo`}
      >
        <span>Muito negativo</span>
        <div className="educational-trend-track">
          <i style={{ left: `${scorePercent}%` }} aria-hidden="true" />
        </div>
        <span>Muito positivo</span>
      </div>

      <dl className="educational-trend-meta">
        <div>
          <dt>Score</dt>
          <dd>{trend.score}</dd>
        </div>
        <div>
          <dt>Confianca</dt>
          <dd>{confidenceLabel(trend.confidence)}</dd>
        </div>
        <div>
          <dt>Data dos dados</dt>
          <dd>{formatTrendDate(trend.dataAsOf)}</dd>
        </div>
      </dl>

      <TrendFactorGroup title="Fatores positivos" factors={positiveFactors} />
      <TrendFactorGroup title="Fatores neutros" factors={neutralFactors} />
      <TrendFactorGroup title="Fatores de atencao" factors={attentionFactors} />

      {portfolioContext ? (
        <div className="portfolio-context-box">
          <strong>Contexto da carteira</strong>
          <p>
            Tendencia de preco, concentracao e diversificacao sao leituras
            separadas. Este ativo representa {portfolioContext.assetPercent}% da
            carteira simulada; o tipo representa {portfolioContext.typePercent}
            %.
          </p>
        </div>
      ) : null}

      {trend.warnings.length > 0 ? (
        <div className="trend-warning-list">
          <strong>Alertas de concentracao e dados</strong>
          <ul>
            {trend.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <details className="trend-methodology">
        <summary>Como foi calculado?</summary>
        <p>
          O score combina comportamento recente de preco, medias disponiveis,
          variacao diaria, volatilidade, volume e contexto educativo da carteira
          simulada. A versao da metodologia e {trend.methodologyVersion}.
        </p>
      </details>

      <p className="trend-disclaimer">{trend.disclaimer}</p>
    </section>
  );
}

function TrendFactorGroup({
  title,
  factors,
}: {
  title: string;
  factors: EducationalTrendFactor[];
}) {
  return (
    <div className="trend-factor-group">
      <strong>{title}</strong>
      {factors.length === 0 ? (
        <p>Nenhum fator nesta categoria.</p>
      ) : (
        <ul>
          {factors.map((factor) => (
            <li key={factor.code}>
              <span aria-hidden="true">{factorIcon(factor.impact)}</span>
              <div>
                <b>{factor.label}</b>
                <small>{factor.explanation}</small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type PortfolioConcentrationContext = {
  assetPercent: string;
  typePercent: string;
};

function portfolioContextForItem(
  item: MarketCatalogItem,
  portfolio?: Portfolio,
): PortfolioConcentrationContext | undefined {
  const positions = portfolio?.positions ?? [];
  const total = portfolio?.totalMarketValueCents ?? 0;
  if (positions.length === 0 || total <= 0) {
    return undefined;
  }
  const assetValue =
    positions.find((position) => position.symbol === item.symbol)
      ?.currentValueCents ?? 0;
  const typeValue = positions
    .filter((position) => position.assetType === item.type)
    .reduce((sum, position) => sum + position.currentValueCents, 0);
  return {
    assetPercent: formatPercent(assetValue, total),
    typePercent: formatPercent(typeValue, total),
  };
}

function formatPercent(value: number, total: number): string {
  return ((value * 100) / total).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function factorIcon(impact: EducationalTrendFactor["impact"]): string {
  if (impact === "POSITIVE") {
    return "+";
  }
  if (impact === "NEGATIVE") {
    return "!";
  }
  return "=";
}

function trendClassificationLabel(
  classification: EducationalTrend["classification"],
): string {
  const labels: Record<EducationalTrend["classification"], string> = {
    MOMENTO_MUITO_POSITIVO: "Muito positivo",
    MOMENTO_POSITIVO: "Positivo",
    MOMENTO_NEUTRO: "Neutro",
    MOMENTO_NEGATIVO: "Negativo",
    MOMENTO_MUITO_NEGATIVO: "Muito negativo",
    DADOS_INSUFICIENTES: "Dados insuficientes",
  };
  return labels[classification];
}

function trendTone(classification: EducationalTrend["classification"]): string {
  if (classification.includes("POSITIVO")) {
    return "positive";
  }
  if (classification.includes("NEGATIVO")) {
    return "negative";
  }
  if (classification === "DADOS_INSUFICIENTES") {
    return "insufficient";
  }
  return "neutral";
}

function confidenceLabel(confidence: EducationalTrend["confidence"]): string {
  const labels: Record<EducationalTrend["confidence"], string> = {
    LOW: "Baixa",
    MEDIUM: "Media",
    HIGH: "Alta",
  };
  return labels[confidence];
}

function formatTrendDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Indisponivel";
  }
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function MarketSkeleton() {
  return (
    <section className="market-grid" aria-label="Carregando ativos">
      {Array.from({ length: 6 }, (_, index) => (
        <div className="market-skeleton" key={index}>
          <LoadingState message="Carregando ativo..." />
        </div>
      ))}
    </section>
  );
}

function resolveTypeFilters(
  tab: MarketViewKey,
  type: "" | MarketAssetType,
): MarketAssetType[] {
  const base = groupTypeFilters[tab];
  if (type) {
    return base.length === 0 || base.includes(type) ? [type] : [];
  }
  return base;
}

function parseTab(value: string | null): MarketViewKey {
  return marketTabs.some((tab) => tab.key === value)
    ? (value as MarketViewKey)
    : "all";
}

function parseType(value: string | null): "" | MarketAssetType {
  return typeOptions.some((option) => option.value === value)
    ? (value as "" | MarketAssetType)
    : "";
}

function parseSortBy(value: string | null): MarketCatalogSortBy {
  return sortOptions.some((option) => option.value === value)
    ? (value as MarketCatalogSortBy)
    : "name";
}

function parseSortOrder(value: string | null): MarketCatalogSortOrder {
  return value === "desc" ? "desc" : "asc";
}

function parsePositiveInteger(value: string | null, fallback: number): number {
  const parsed = value ? Number.parseInt(value, 10) : fallback;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}
