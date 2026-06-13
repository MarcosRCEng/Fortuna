import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { EmptyState } from "../components/EmptyState.js";
import { ErrorState } from "../components/ErrorState.js";
import { LoadingState } from "../components/LoadingState.js";
import { getMarketCatalog } from "../services/marketCatalogApi.js";
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
  sortPersonalItems,
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

const typeOptions: Array<{ value: "" | MarketAssetType; label: string }> = [
  { value: "", label: "Todos os tipos" },
  { value: "STOCK", label: "Acoes" },
  { value: "UNIT", label: "Units" },
  { value: "FII", label: "FIIs" },
  { value: "ETF", label: "ETFs" },
  { value: "FI_INFRA", label: "FI-Infra" },
  { value: "FI_AGRO", label: "Fiagro" },
  { value: "FIP", label: "FIP" },
  { value: "FIDC", label: "FIDC" },
  { value: "BDR", label: "BDR" },
];

const sortOptions: Array<{ value: MarketCatalogSortBy; label: string }> = [
  { value: "name", label: "Nome" },
  { value: "price", label: "Preco" },
  { value: "changePercent", label: "Variacao" },
  { value: "volume", label: "Volume" },
  { value: "marketCap", label: "Valor de mercado" },
];

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
  onRefreshMarket,
}: {
  portfolio?: Portfolio;
  refreshing: boolean;
  submitting: boolean;
  onBuy(asset: Asset): void;
  onViewEducation(asset: Asset): void;
  onRefreshMarket(): void;
}) {
  const initial = useMemo(() => initialSearchParams(), []);
  const [activeTab, setActiveTab] = useState<MarketViewKey>(initial.tab);
  const [searchInput, setSearchInput] = useState(initial.search);
  const [debouncedSearch, setDebouncedSearch] = useState(initial.search);
  const [sector, setSector] = useState(initial.sector);
  const [type, setType] = useState<"" | MarketAssetType>(initial.type);
  const [sortBy, setSortBy] = useState<MarketCatalogSortBy>(initial.sortBy);
  const [sortOrder, setSortOrder] =
    useState<MarketCatalogSortOrder>(initial.sortOrder);
  const [page, setPage] = useState(initial.page);
  const [pageSize, setPageSize] = useState(initial.pageSize);
  const [catalog, setCatalog] = useState<MarketCatalogPage>();
  const [watchlist, setWatchlist] = useState<PlayerWatchlist>();
  const [favoriteSymbols, setFavoriteSymbols] = useState<Set<string>>(new Set());
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string>();
  const [watchlistError, setWatchlistError] = useState<string>();
  const [favoriteError, setFavoriteError] = useState<string>();
  const preferencesLoaded = useRef(false);

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
        sortBy: sortBy === "name" || sortBy === "price" || sortBy === "changePercent"
          ? sortBy
          : "symbol",
        sortOrder,
        maxItemsPerGroup: pageSize,
      }).then((nextWatchlist) => {
        setWatchlist(nextWatchlist);
        setFavoriteSymbols(
          new Set(nextWatchlist.items.map((item) => item.symbol)),
        );
      }).catch(() => {
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
    ? catalog?.items ?? []
    : personalItems.pageItems;
  const totalItems = isCatalogView(activeTab)
    ? catalog?.totalItems ?? 0
    : personalItems.all.length;
  const totalPages = isCatalogView(activeTab)
    ? catalog?.totalPages ?? 0
    : personalItems.totalPages;
  const hasNextPage = isCatalogView(activeTab)
    ? Boolean(catalog?.hasNextPage)
    : page < personalItems.totalPages;
  const isLoading = catalogLoading || watchlistLoading;
  const isFallback = catalog?.source === "MOCK" || catalog?.source === "CACHE";

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
            {typeOptions.map((option) => (
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
        {isFallback ? <span>Fallback {catalog?.source.toLowerCase()}</span> : null}
        {watchlistError ? <span>Watchlist indisponivel</span> : null}
      </section>

      {favoriteError ? <ErrorState message={favoriteError} /> : null}
      {catalogError ? <ErrorState message={catalogError} /> : null}

      <section className="treasury-coming-soon" aria-label="Tesouro em preparacao">
        <strong>Tesouro Direto em preparacao</strong>
        <span>Capability desabilitada. Nenhuma cotacao real ou operacao e exibida aqui.</span>
      </section>

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
              onFavorite={() => void handleFavorite(item.symbol)}
              onBuy={() => onBuy(mapCatalogItemToAsset(item))}
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
}: {
  item: MarketCatalogItem;
  favorite: boolean;
  disabled: boolean;
  onFavorite(): void;
  onBuy(): void;
}) {
  const change = formatChangePercent(item.changePercent);
  const canBuy = item.tradableInFortuna && item.priceCents !== undefined;
  return (
    <article className="market-asset-card">
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
          onClick={onFavorite}
        >
          {favorite ? "★" : "☆"}
        </button>
      </div>
      <h2>{item.name}</h2>
      <div className="badge-row">
        <span className="badge badge-neutral">{marketTypeLabel(item.type)}</span>
        {item.sector ? <span className="badge badge-neutral">{item.sector}</span> : null}
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
        onClick={onBuy}
      >
        Comprar
      </button>
    </article>
  );
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
