import type {
  HistoricalPrice,
  MarketAsset,
  MarketAssetGroup,
  MarketAssetType,
  MarketCatalogItem,
  MarketCatalogPage,
  MarketCatalogQuery,
  MarketCatalogSortBy,
  MarketCatalogSortOrder,
  MarketDataProviderName,
  MarketHistoryInterval,
  MarketHistoryRange,
  MarketProviderCapabilities,
  MarketProviderStatus as MvpMarketProviderStatus,
  MarketQuote as MvpMarketQuote,
} from "@fortuna/domain";
import type { LoggerPort } from "@fortuna/application";
import {
  readMarketDataConfig,
  type MarketDataConfig,
} from "../config/MarketDataConfig.js";

type FetchLike = (
  input: string | URL,
  init?: {
    headers?: Record<string, string>;
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
}>;

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

type BrapiQuoteResponse = {
  results?: BrapiQuote[];
};

type BrapiCatalogResponse = {
  results?: BrapiCatalogEntry[];
  stocks?: BrapiCatalogEntry[];
};

type BrapiCatalogParams = {
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  limit?: number;
  page?: number;
  sector?: string;
  type?: string;
  subType?: string;
};

type BrapiQuote = {
  symbol?: string;
  shortName?: string;
  longName?: string;
  subType?: string;
  sector?: string;
  logourl?: string;
  logoUrl?: string;
  currency?: string;
  regularMarketPrice?: number;
  regularMarketPreviousClose?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: string | number;
  historicalDataPrice?: BrapiHistoricalPoint[];
};

type BrapiHistoricalPoint = {
  date?: number | string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
};

type BrapiCatalogEntry = {
  symbol?: string;
  stock?: string;
  name?: string;
  shortName?: string;
  longName?: string;
  subType?: string;
  sector?: string;
  currency?: string;
  close?: number;
  regularMarketPrice?: number;
  change?: number;
  changePercent?: number;
  regularMarketChangePercent?: number;
  volume?: number;
  marketCap?: number;
  market_cap?: number;
  logoUrl?: string;
  logourl?: string;
};

export interface MvpMarketDataServiceOptions {
  config?: MarketDataConfig;
  fetch?: FetchLike;
  logger?: LoggerPort;
  clock?: () => Date;
}

const ALLOWED_MARKET_ASSETS: MarketAsset[] = [
  {
    symbol: "PETR4",
    name: "Petrobras PN",
    assetType: "STOCK",
    currency: "BRL",
  },
  { symbol: "VALE3", name: "Vale ON", assetType: "STOCK", currency: "BRL" },
  {
    symbol: "ITUB4",
    name: "Itau Unibanco PN",
    assetType: "STOCK",
    currency: "BRL",
  },
  {
    symbol: "MGLU3",
    name: "Magazine Luiza ON",
    assetType: "STOCK",
    currency: "BRL",
  },
];

const VALID_RANGES = new Set<MarketHistoryRange>(["1mo", "3mo", "6mo", "1y"]);
const VALID_INTERVALS = new Set<MarketHistoryInterval>(["1d"]);
const MIN_CATALOG_PAGE_SIZE = 1;
const CATALOG_CACHE_CONTRACT_VERSION = "v2";
const DEFAULT_CATALOG_SORT_BY: MarketCatalogSortBy = "name";
const DEFAULT_CATALOG_SORT_ORDER: MarketCatalogSortOrder = "asc";
const VALID_CATALOG_SORT_BY = new Set<MarketCatalogSortBy>([
  "name",
  "price",
  "changePercent",
  "volume",
  "marketCap",
]);
const VALID_CATALOG_SORT_ORDER = new Set<MarketCatalogSortOrder>([
  "asc",
  "desc",
]);
const FILTERABLE_MARKET_ASSET_TYPES = new Set<MarketAssetType>([
  "STOCK",
  "UNIT",
  "FII",
  "ETF",
  "FI_INFRA",
  "FI_AGRO",
  "FIP",
  "FIDC",
  "BDR",
  "TREASURY",
]);

const BRAPI_CATALOG_SORT_BY: Record<MarketCatalogSortBy, string> = {
  name: "name",
  price: "close",
  changePercent: "change",
  volume: "volume",
  marketCap: "market_cap",
};

const BRAPI_CATALOG_SUB_TYPES: Partial<Record<MarketAssetType, string>> = {
  STOCK: "stock",
  UNIT: "unit",
  FII: "fii",
  ETF: "etf",
  FI_INFRA: "fi-infra",
  FI_AGRO: "fi-agro",
  FIP: "fip",
  FIDC: "fidc",
  BDR: "bdr",
  TREASURY: "treasury",
};

const MOCK_CATALOG_ITEMS: MarketCatalogItem[] = [
  {
    symbol: "ITUB4",
    name: "Itau Unibanco PN",
    type: "STOCK",
    group: "EQUITIES",
    sector: "Financeiro",
    priceCents: 3425,
    changePercent: 1.24,
    volume: 22_500_000,
    marketCapCents: 320_000_000_000_00,
    currency: "BRL",
    tradableInFortuna: true,
  },
  {
    symbol: "PETR4",
    name: "Petrobras PN",
    type: "STOCK",
    group: "EQUITIES",
    sector: "Energia",
    priceCents: 3842,
    changePercent: -0.42,
    volume: 31_000_000,
    marketCapCents: 510_000_000_000_00,
    currency: "BRL",
    tradableInFortuna: true,
  },
  {
    symbol: "VALE3",
    name: "Vale ON",
    type: "STOCK",
    group: "EQUITIES",
    sector: "Materiais Basicos",
    priceCents: 6210,
    changePercent: 0.38,
    volume: 18_900_000,
    marketCapCents: 280_000_000_000_00,
    currency: "BRL",
    tradableInFortuna: true,
  },
  {
    symbol: "MGLU3",
    name: "Magazine Luiza ON",
    type: "STOCK",
    group: "EQUITIES",
    sector: "Consumo",
    priceCents: 185,
    changePercent: -1.15,
    volume: 14_600_000,
    marketCapCents: 1_300_000_000_00,
    currency: "BRL",
    tradableInFortuna: true,
  },
  {
    symbol: "KLBN11",
    name: "Klabin Unit",
    type: "UNIT",
    group: "EQUITIES",
    sector: "Papel e Celulose",
    priceCents: 2176,
    changePercent: 0.12,
    volume: 4_100_000,
    marketCapCents: 25_000_000_000_00,
    currency: "BRL",
    tradableInFortuna: false,
  },
  {
    symbol: "HGLG11",
    name: "CSHG Logistica FII",
    type: "FII",
    group: "REAL_ESTATE_FUNDS",
    sector: "Logistica",
    priceCents: 16250,
    changePercent: 0.08,
    volume: 940_000,
    marketCapCents: 5_200_000_000_00,
    currency: "BRL",
    tradableInFortuna: false,
  },
  {
    symbol: "BOVA11",
    name: "iShares Ibovespa ETF",
    type: "ETF",
    group: "EXCHANGE_TRADED_FUNDS",
    sector: "Indice",
    priceCents: 12840,
    changePercent: 0.91,
    volume: 7_850_000,
    marketCapCents: 16_000_000_000_00,
    currency: "BRL",
    tradableInFortuna: false,
  },
  {
    symbol: "IFRA11",
    name: "Fundo Infraestrutura Fortuna",
    type: "FI_INFRA",
    group: "OTHER_LISTED_FUNDS",
    sector: "Infraestrutura",
    priceCents: 10940,
    changePercent: -0.11,
    volume: 210_000,
    marketCapCents: 920_000_000_00,
    currency: "BRL",
    tradableInFortuna: false,
  },
  {
    symbol: "RURA11",
    name: "Fundo Agro Fortuna",
    type: "FI_AGRO",
    group: "OTHER_LISTED_FUNDS",
    sector: "Agronegocio",
    priceCents: 9840,
    changePercent: 0.22,
    volume: 185_000,
    marketCapCents: 740_000_000_00,
    currency: "BRL",
    tradableInFortuna: false,
  },
  {
    symbol: "PEVC11",
    name: "Fundo Participacoes Fortuna",
    type: "FIP",
    group: "OTHER_LISTED_FUNDS",
    sector: "Participacoes",
    priceCents: 7450,
    changePercent: -0.35,
    volume: 54_000,
    marketCapCents: 410_000_000_00,
    currency: "BRL",
    tradableInFortuna: false,
  },
  {
    symbol: "CRDC11",
    name: "Fundo Direitos Creditorios Fortuna",
    type: "FIDC",
    group: "OTHER_LISTED_FUNDS",
    sector: "Credito",
    priceCents: 10120,
    changePercent: 0.05,
    volume: 82_000,
    marketCapCents: 680_000_000_00,
    currency: "BRL",
    tradableInFortuna: false,
  },
  {
    symbol: "AURA33",
    name: "Aura Minerals BDR",
    type: "BDR",
    group: "EQUITIES",
    sector: "BDR",
    priceCents: 3055,
    changePercent: 1.72,
    volume: 320_000,
    marketCapCents: 2_200_000_000_00,
    currency: "BRL",
    tradableInFortuna: false,
  },
  {
    symbol: "TS2029",
    name: "Tesouro Selic 2029",
    type: "TREASURY",
    group: "FIXED_INCOME",
    sector: "Tesouro Direto",
    currency: "BRL",
    tradableInFortuna: false,
  },
];

export class MvpMarketDataService {
  private readonly config: MarketDataConfig;
  private readonly fetchImpl: FetchLike;
  private readonly logger?: LoggerPort;
  private readonly clock: () => Date;
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private lastSuccessfulFetchAt: string | null = null;
  private lastFallbackAt: string | null = null;

  constructor(options: MvpMarketDataServiceOptions = {}) {
    this.config = options.config ?? readMarketDataConfig().config;
    this.fetchImpl = options.fetch ?? fetch;
    this.logger = options.logger;
    this.clock = options.clock ?? (() => new Date());
  }

  listAssets(): MarketAsset[] {
    return this.allowedAssets();
  }

  async getCatalog(query: MarketCatalogQuery): Promise<MarketCatalogPage> {
    const normalizedQuery = this.normalizeCatalogQuery(query);
    const cacheKey = this.buildCatalogCacheKey(normalizedQuery);
    const cached = this.getCached<MarketCatalogPage>(cacheKey, {
      includeExpired: false,
    });
    if (cached) {
      this.logMarketOperation("catalog", "cache_hit", {
        cacheHit: true,
        itemCount: cached.items.length,
      });
      return {
        ...cached,
        source: "CACHE",
        items: cached.items.map((item) => ({ ...item })),
      };
    }

    this.logMarketOperation("catalog", "cache_miss", { cacheHit: false });
    const page = await this.withMockFallback(
      "catalog",
      () => this.fetchBrapiCatalog(normalizedQuery),
      () =>
        this.buildCatalogPage(
          MOCK_CATALOG_ITEMS,
          normalizedQuery,
          "MOCK",
          false,
          this.clock().toISOString(),
        ),
      {
        page: normalizedQuery.page,
        pageSize: normalizedQuery.pageSize,
      },
      () =>
        this.getCached<MarketCatalogPage>(cacheKey, { includeExpired: true }),
    );
    if (page.source !== "CACHE") {
      this.setCached(cacheKey, page, this.config.catalog.cacheTtlSeconds);
    }
    return page;
  }

  async getQuotes(symbols: string[]): Promise<MvpMarketQuote[]> {
    const normalized = this.normalizeAndValidateSymbols(symbols);
    this.assertWithinRequestLimit(normalized);
    const cacheKey = `market:${this.activeProviderName()}:quotes:${normalized.join(",")}`;
    const cached = this.getCached<MvpMarketQuote[]>(cacheKey);
    if (cached) {
      return cached.map((quote) => ({ ...quote, provider: "cache" }));
    }

    const quotes = await this.withMockFallback(
      "quotes",
      () => this.fetchBrapiQuotes(normalized),
      () => this.getMockQuotes(normalized),
      { symbols: normalized },
    );
    this.setCached(cacheKey, quotes);
    return quotes;
  }

  async getHistoricalPrices(params: {
    symbol: string;
    range: MarketHistoryRange;
    interval: MarketHistoryInterval;
  }): Promise<HistoricalPrice[]> {
    const [symbol] = this.normalizeAndValidateSymbols([params.symbol]);
    this.assertValidRange(params.range);
    this.assertValidInterval(params.interval);
    const cacheKey = `market:${this.activeProviderName()}:history:${symbol}:${params.range}:${params.interval}`;
    const cached = this.getCached<HistoricalPrice[]>(cacheKey);
    if (cached) {
      return cached.map((point) => ({ ...point, provider: "cache" }));
    }

    const history = await this.withMockFallback(
      "history",
      () => this.fetchBrapiHistory(symbol, params.range, params.interval),
      () => this.getMockHistory(symbol, params.range),
      { symbol, range: params.range, interval: params.interval },
    );
    this.setCached(cacheKey, history);
    return history;
  }

  getStatus(): MvpMarketProviderStatus {
    const realDataEnabled =
      this.config.provider === "brapi" && this.config.allowRealData;
    const hasToken = Boolean(this.config.brapi.apiToken);
    return {
      provider: this.activeProviderName(),
      realDataEnabled,
      hasToken,
      cacheTtlSeconds: this.config.brapi.cacheTtlSeconds,
      catalogCacheTtlSeconds: this.config.catalog.cacheTtlSeconds,
      catalogMaxPageSize: this.config.catalog.maxPageSize,
      catalogProviderConcurrency: this.config.catalog.providerConcurrency,
      capabilities: this.getCapabilities(),
      lastSuccessfulFetchAt: this.lastSuccessfulFetchAt,
      status: this.resolveStatus(realDataEnabled, hasToken),
    };
  }

  getAllowedSymbols(): string[] {
    return this.allowedAssets().map((asset) => asset.symbol);
  }

  private buildCatalogCacheKey(query: MarketCatalogQuery): string {
    const cacheShape = {
      contract: CATALOG_CACHE_CONTRACT_VERSION,
      search: query.search?.trim().toLocaleLowerCase("pt-BR") ?? "",
      types: query.assetTypes ?? [],
      sectors:
        query.sectors?.map((sector) =>
          sector.trim().toLocaleLowerCase("pt-BR"),
        ) ?? [],
      sortBy: query.sortBy ?? DEFAULT_CATALOG_SORT_BY,
      sortOrder: query.sortOrder ?? DEFAULT_CATALOG_SORT_ORDER,
      page: query.page,
      pageSize: query.pageSize,
    };
    return `market:catalog:${CATALOG_CACHE_CONTRACT_VERSION}:${JSON.stringify(cacheShape)}`;
  }

  private getCapabilities(): MarketProviderCapabilities {
    return {
      listedCatalog: this.config.capabilities.listedCatalog,
      basicQuotes: this.config.capabilities.basicQuotes,
      detailedFiiData: this.config.capabilities.detailedFiiData,
      treasury: this.config.capabilities.treasury,
      analystConsensus: false,
    };
  }

  private async withMockFallback<T>(
    action: string,
    realLoader: () => Promise<T>,
    mockLoader: () => T,
    context: Record<string, unknown>,
    staleLoader?: () => T | undefined,
  ): Promise<T> {
    if (!this.canUseRealData()) {
      return mockLoader();
    }

    const startedAt = this.clock().getTime();
    try {
      const value = await realLoader();
      this.lastSuccessfulFetchAt = this.clock().toISOString();
      this.logMarketOperation(action, "success", {
        durationMs: this.clock().getTime() - startedAt,
        itemCount: inferItemCount(value),
        cacheHit: false,
      });
      return value;
    } catch (error) {
      this.lastFallbackAt = this.clock().toISOString();
      const stale = staleLoader?.();
      if (stale) {
        this.logMarketOperation(action, "stale_cache", {
          durationMs: this.clock().getTime() - startedAt,
          itemCount: inferItemCount(stale),
          cacheHit: true,
        });
        return markCatalogCacheSource(stale);
      }
      this.logger?.warn("Market data fallback used", {
        module: "market_data",
        action: "market_data_fallback_used",
        context: {
          provider: "brapi",
          fallbackProvider: "mock",
          operation: action,
          reason: error instanceof Error ? error.name : "UnknownError",
          message: error instanceof Error ? error.message : undefined,
          ...context,
        },
      });
      this.logMarketOperation(action, "fallback", {
        durationMs: this.clock().getTime() - startedAt,
        cacheHit: false,
      });
      return mockLoader();
    }
  }

  private logMarketOperation(
    operation: string,
    result: string,
    context: Record<string, unknown> = {},
  ): void {
    this.logger?.info("Market data operation", {
      module: "market_data",
      action: "market_data_operation",
      context: {
        provider: this.activeProviderName(),
        operation,
        result,
        ...context,
      },
    });
  }

  private async fetchBrapiQuotes(symbols: string[]): Promise<MvpMarketQuote[]> {
    const payload = await this.fetchBrapiPayload(symbols);
    const results = Array.isArray(payload.results) ? payload.results : [];
    if (results.length === 0) {
      throw new InvalidBrapiResponseError("brapi returned no quote results.");
    }

    const quotes = results.map((quote) => this.mapBrapiQuote(quote));
    if (quotes.length !== symbols.length) {
      throw new InvalidBrapiResponseError(
        "brapi did not return all requested symbols.",
      );
    }
    return quotes;
  }

  private async fetchBrapiHistory(
    symbol: string,
    range: MarketHistoryRange,
    interval: MarketHistoryInterval,
  ): Promise<HistoricalPrice[]> {
    const payload = await this.fetchBrapiPayload([symbol], { range, interval });
    const points = payload.results?.[0]?.historicalDataPrice ?? [];
    const history = points.map((point) =>
      this.mapBrapiHistoricalPoint(symbol, point),
    );
    if (history.length === 0) {
      throw new InvalidBrapiResponseError(
        "brapi returned no historical price points.",
      );
    }
    return history;
  }

  private async fetchBrapiCatalog(
    query: MarketCatalogQuery,
  ): Promise<MarketCatalogPage> {
    const requestedSubTypes = this.toBrapiCatalogSubTypes(query.assetTypes);
    const baseParams = this.toBrapiCatalogParams(query);
    const rawItems =
      requestedSubTypes.length > 1
        ? (
            await mapWithConcurrency(
              requestedSubTypes,
              this.config.catalog.providerConcurrency,
              (subType) =>
                this.fetchBrapiCatalogEntries({
                  ...baseParams,
                  subType,
                  page: 1,
                  limit: this.externalCatalogLimit(query),
                }),
            )
          ).flat()
        : await this.fetchBrapiCatalogEntries({
            ...baseParams,
            subType: requestedSubTypes[0],
            page: 1,
            limit: this.externalCatalogLimit(query),
          });
    const items = dedupeCatalogItemsBySymbol(
      rawItems
        .map((item) => this.mapBrapiCatalogItem(item))
        .filter((item) => item !== undefined),
    );
    return this.buildCatalogPage(
      items,
      query,
      "BRAPI",
      true,
      this.clock().toISOString(),
    );
  }

  private async fetchBrapiCatalogEntries(
    params: BrapiCatalogParams,
  ): Promise<BrapiCatalogEntry[]> {
    const url = this.buildBrapiCatalogUrl(params);
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.brapi.timeoutMs,
    );

    try {
      const response = await this.fetchImpl(url, {
        headers: this.config.brapi.apiToken
          ? { Authorization: `Bearer ${this.config.brapi.apiToken}` }
          : {},
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new BrapiHttpError(response.status, response.statusText);
      }
      const payload = (await response.json()) as BrapiCatalogResponse;
      if (
        !payload ||
        (payload.results !== undefined && !Array.isArray(payload.results)) ||
        (payload.stocks !== undefined && !Array.isArray(payload.stocks)) ||
        (payload.results === undefined && payload.stocks === undefined)
      ) {
        throw new InvalidBrapiResponseError(
          "brapi catalog response is incomplete.",
        );
      }
      return Array.isArray(payload.results) ? payload.results : payload.stocks!;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new BrapiTimeoutError();
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildBrapiCatalogUrl(params: BrapiCatalogParams): URL {
    const url = new URL(
      `${this.config.brapi.baseUrl.replace(/\/+$/, "")}/quote/list`,
    );
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
    return url;
  }

  private toBrapiCatalogParams(query: MarketCatalogQuery): BrapiCatalogParams {
    return {
      search: query.search,
      sortBy: BRAPI_CATALOG_SORT_BY[query.sortBy ?? DEFAULT_CATALOG_SORT_BY],
      sortOrder: query.sortOrder ?? DEFAULT_CATALOG_SORT_ORDER,
      limit: this.externalCatalogLimit(query),
      page: 1,
      sector: query.sectors?.length === 1 ? query.sectors[0] : undefined,
    };
  }

  private toBrapiCatalogSubTypes(
    assetTypes: MarketAssetType[] | undefined,
  ): string[] {
    if (!assetTypes || assetTypes.length === 0) {
      return [];
    }
    return assetTypes
      .filter(
        (assetType) =>
          assetType !== "TREASURY" || this.getCapabilities().treasury,
      )
      .map((assetType) => BRAPI_CATALOG_SUB_TYPES[assetType])
      .filter((subType) => subType !== undefined);
  }

  private externalCatalogLimit(query: MarketCatalogQuery): number {
    return Math.max(1, query.page * query.pageSize);
  }

  private async fetchBrapiPayload(
    symbols: string[],
    params: Record<string, string | undefined> = {},
  ): Promise<BrapiQuoteResponse> {
    const url = new URL(
      `${this.config.brapi.baseUrl.replace(/\/+$/, "")}/quote/${symbols.join(",")}`,
    );
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.brapi.timeoutMs,
    );

    try {
      const response = await this.fetchImpl(url, {
        headers: this.config.brapi.apiToken
          ? { Authorization: `Bearer ${this.config.brapi.apiToken}` }
          : {},
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new BrapiHttpError(response.status, response.statusText);
      }
      return (await response.json()) as BrapiQuoteResponse;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new BrapiTimeoutError();
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private mapBrapiQuote(quote: BrapiQuote): MvpMarketQuote {
    if (!quote.symbol || quote.regularMarketPrice === undefined) {
      throw new InvalidBrapiResponseError("brapi quote is incomplete.");
    }
    const symbol = quote.symbol.trim().toUpperCase();
    const asset = this.assetFor(symbol);
    const assetType = mapBrapiSubTypeToMarketAssetType(
      quote.subType,
      this.logger,
    );
    const priceInCents = toCents(quote.regularMarketPrice);
    const previousClose =
      quote.regularMarketPreviousClose === undefined
        ? undefined
        : toCents(quote.regularMarketPreviousClose);

    return {
      ...asset,
      symbol,
      name: quote.longName ?? quote.shortName ?? asset.name,
      assetType: assetType === "UNKNOWN" ? asset.assetType : assetType,
      currency: quote.currency === "USD" ? "USD" : asset.currency,
      priceInCents,
      regularMarketChangePercent: quote.regularMarketChangePercent ?? 0,
      regularMarketChangeInCents:
        quote.regularMarketChange === undefined
          ? previousClose === undefined
            ? undefined
            : priceInCents - previousClose
          : toCents(quote.regularMarketChange),
      regularMarketPreviousCloseInCents: previousClose,
      marketTime: normalizeMarketTime(quote.regularMarketTime, this.clock()),
      provider: "brapi",
      isRealData: true,
      isDelayed: true,
    };
  }

  private mapBrapiCatalogItem(
    item: BrapiCatalogEntry,
  ): MarketCatalogItem | undefined {
    const rawSymbol = item.symbol ?? item.stock;
    if (!rawSymbol) {
      return undefined;
    }
    const symbol = normalizeMarketSymbol(rawSymbol);
    const type = mapBrapiSubTypeToMarketAssetType(item.subType, this.logger);
    const price = item.regularMarketPrice ?? item.close;
    const marketCap = item.marketCap ?? item.market_cap;
    return {
      symbol,
      name: item.longName ?? item.shortName ?? item.name ?? symbol,
      type,
      group: marketAssetGroupForType(type),
      sector: normalizeOptionalText(item.sector),
      priceCents: toOptionalCents(price),
      changePercent: item.regularMarketChangePercent ?? item.changePercent,
      volume: item.volume,
      marketCapCents: toOptionalCents(marketCap),
      logoUrl: item.logoUrl ?? item.logourl,
      currency: "BRL",
      tradableInFortuna: this.isTradableInFortuna(symbol, type),
    };
  }

  private mapBrapiHistoricalPoint(
    symbol: string,
    point: BrapiHistoricalPoint,
  ): HistoricalPrice {
    if (point.close === undefined || point.date === undefined) {
      throw new InvalidBrapiResponseError(
        "brapi historical point is incomplete.",
      );
    }

    return {
      symbol,
      date: normalizeHistoryDate(point.date),
      openInCents: point.open === undefined ? undefined : toCents(point.open),
      highInCents: point.high === undefined ? undefined : toCents(point.high),
      lowInCents: point.low === undefined ? undefined : toCents(point.low),
      closeInCents: toCents(point.close),
      volume: point.volume,
      provider: "brapi",
      isRealData: true,
    };
  }

  private getMockQuotes(symbols: string[]): MvpMarketQuote[] {
    return symbols.map((symbol) => {
      const asset = this.assetFor(symbol);
      const priceInCents = this.mockCloseInCents(symbol, this.clock());
      const previousClose = this.mockCloseInCents(
        symbol,
        addDays(this.clock(), -1),
      );
      return {
        ...asset,
        priceInCents,
        regularMarketChangePercent:
          previousClose <= 0
            ? 0
            : Number(
                (
                  ((priceInCents - previousClose) / previousClose) *
                  100
                ).toFixed(2),
              ),
        regularMarketChangeInCents: priceInCents - previousClose,
        regularMarketPreviousCloseInCents: previousClose,
        marketTime: this.clock().toISOString(),
        provider: "mock",
        isRealData: false,
        isDelayed: false,
      };
    });
  }

  private getMockHistory(
    symbol: string,
    range: MarketHistoryRange,
  ): HistoricalPrice[] {
    const days = rangeToDays(range);
    const end = startOfUtcDay(this.clock());
    const points: HistoricalPrice[] = [];
    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const date = addDays(end, -offset);
      const close = this.mockCloseInCents(symbol, date);
      const open = this.mockCloseInCents(symbol, addDays(date, -1));
      const spread = Math.max(1, Math.trunc(close * 0.008));
      points.push({
        symbol,
        date: date.toISOString().slice(0, 10),
        openInCents: open,
        highInCents: Math.max(open, close) + spread,
        lowInCents: Math.max(1, Math.min(open, close) - spread),
        closeInCents: close,
        volume:
          1_000_000 +
          (this.hash(`${symbol}:${date.toISOString()}:volume`) % 500_000),
        provider: "mock",
        isRealData: false,
      });
    }
    return points;
  }

  private buildCatalogPage(
    items: MarketCatalogItem[],
    query: MarketCatalogQuery,
    source: MarketCatalogPage["source"],
    delayed: boolean,
    fetchedAt: string,
  ): MarketCatalogPage {
    const filtered = this.sortCatalogItems(
      this.filterCatalogItems(items, query),
      query.sortBy ?? DEFAULT_CATALOG_SORT_BY,
      query.sortOrder ?? DEFAULT_CATALOG_SORT_ORDER,
    );
    const totalItems = filtered.length;
    const totalPages =
      totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
    const start = (query.page - 1) * query.pageSize;
    const pageItems = filtered.slice(start, start + query.pageSize);

    return {
      items: pageItems.map((item) => ({ ...item })),
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages,
      hasNextPage: query.page < totalPages,
      source,
      delayed,
      fetchedAt,
    };
  }

  private filterCatalogItems(
    items: MarketCatalogItem[],
    query: MarketCatalogQuery,
  ): MarketCatalogItem[] {
    const search = query.search?.trim().toUpperCase();
    const types = query.assetTypes ? new Set(query.assetTypes) : undefined;
    const sectors = query.sectors
      ? new Set(query.sectors.map((sector) => sector.toUpperCase()))
      : undefined;

    return items.filter((item) => {
      const matchesSearch =
        !search ||
        item.symbol.toUpperCase().includes(search) ||
        item.name.toUpperCase().includes(search);
      const matchesType = !types || types.has(item.type);
      const matchesSector =
        !sectors ||
        (item.sector !== undefined &&
          sectors.has(item.sector.trim().toUpperCase()));
      return matchesSearch && matchesType && matchesSector;
    });
  }

  private sortCatalogItems(
    items: MarketCatalogItem[],
    sortBy: MarketCatalogSortBy,
    sortOrder: MarketCatalogSortOrder,
  ): MarketCatalogItem[] {
    const direction = sortOrder === "asc" ? 1 : -1;
    return [...items].sort((left, right) => {
      const leftValue = catalogSortValue(left, sortBy);
      const rightValue = catalogSortValue(right, sortBy);
      if (leftValue === undefined && rightValue === undefined) {
        return left.symbol.localeCompare(right.symbol);
      }
      if (leftValue === undefined) {
        return 1;
      }
      if (rightValue === undefined) {
        return -1;
      }
      const comparison = compareCatalogValues(leftValue, rightValue);
      if (comparison !== 0) {
        return comparison * direction;
      }
      return left.symbol.localeCompare(right.symbol);
    });
  }

  private normalizeCatalogQuery(query: MarketCatalogQuery): MarketCatalogQuery {
    if (!Number.isSafeInteger(query.page) || query.page < 1) {
      throw new MarketValidationError(
        "page must be an integer greater than or equal to 1.",
      );
    }
    if (
      !Number.isSafeInteger(query.pageSize) ||
      query.pageSize < MIN_CATALOG_PAGE_SIZE ||
      query.pageSize > this.config.catalog.maxPageSize
    ) {
      throw new MarketValidationError(
        `pageSize must be an integer between ${MIN_CATALOG_PAGE_SIZE} and ${this.config.catalog.maxPageSize}.`,
      );
    }
    if (
      query.sortBy !== undefined &&
      !VALID_CATALOG_SORT_BY.has(query.sortBy)
    ) {
      throw new MarketValidationError(
        "sortBy must be one of: name, price, changePercent, volume, marketCap.",
      );
    }
    if (
      query.sortOrder !== undefined &&
      !VALID_CATALOG_SORT_ORDER.has(query.sortOrder)
    ) {
      throw new MarketValidationError("sortOrder must be asc or desc.");
    }
    const invalidType = query.assetTypes?.find(
      (assetType) => !FILTERABLE_MARKET_ASSET_TYPES.has(assetType),
    );
    if (invalidType) {
      throw new MarketValidationError(
        `Unknown market asset type: ${invalidType}.`,
      );
    }

    return {
      search: normalizeOptionalText(query.search),
      assetTypes:
        query.assetTypes && query.assetTypes.length > 0
          ? [...new Set(query.assetTypes)].sort()
          : undefined,
      sectors:
        query.sectors && query.sectors.length > 0
          ? [
              ...new Set(
                query.sectors.map((sector) => sector.trim()).filter(Boolean),
              ),
            ].sort((left, right) =>
              left.toUpperCase().localeCompare(right.toUpperCase()),
            )
          : undefined,
      sortBy: query.sortBy ?? DEFAULT_CATALOG_SORT_BY,
      sortOrder: query.sortOrder ?? DEFAULT_CATALOG_SORT_ORDER,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  private mockCloseInCents(symbol: string, date: Date): number {
    const base =
      {
        PETR4: 3842,
        VALE3: 6210,
        ITUB4: 3425,
        MGLU3: 185,
      }[symbol] ?? 1000;
    const day = startOfUtcDay(date).toISOString().slice(0, 10);
    const centeredBps = (this.hash(`fortuna:${symbol}:${day}`) % 401) - 200;
    return Math.max(
      1,
      Math.trunc((base * (10_000 + centeredBps) + 5_000) / 10_000),
    );
  }

  private normalizeAndValidateSymbols(symbols: string[]): string[] {
    const normalized = [
      ...new Set(
        symbols
          .flatMap((symbol) => symbol.split(","))
          .map((symbol) => symbol.trim().toUpperCase())
          .filter((symbol) => symbol.length > 0),
      ),
    ];
    if (normalized.length === 0) {
      throw new MarketValidationError(
        "symbols must be a non-empty comma-separated list.",
      );
    }

    const allowed = new Set(this.getAllowedSymbols());
    const blocked = normalized.find((symbol) => !allowed.has(symbol));
    if (blocked) {
      throw new MarketValidationError(
        `Symbol ${blocked} is not allowed for the market data MVP.`,
      );
    }
    return normalized;
  }

  private assertWithinRequestLimit(symbols: string[]): void {
    if (symbols.length > this.config.brapi.maxSymbolsPerRequest) {
      throw new MarketValidationError(
        `At most ${this.config.brapi.maxSymbolsPerRequest} symbol(s) are accepted per request in the MVP.`,
      );
    }
  }

  private assertValidRange(range: string): asserts range is MarketHistoryRange {
    if (!VALID_RANGES.has(range as MarketHistoryRange)) {
      throw new MarketValidationError(
        "range must be one of: 1mo, 3mo, 6mo, 1y.",
      );
    }
  }

  private assertValidInterval(
    interval: string,
  ): asserts interval is MarketHistoryInterval {
    if (!VALID_INTERVALS.has(interval as MarketHistoryInterval)) {
      throw new MarketValidationError("interval must be 1d for the MVP.");
    }
  }

  private getCached<T>(
    key: string,
    options: { includeExpired?: boolean } = {},
  ): T | undefined {
    const entry = this.cache.get(key);
    if (
      !entry ||
      (!options.includeExpired && entry.expiresAt <= this.clock().getTime())
    ) {
      return undefined;
    }
    return entry.value as T;
  }

  private setCached<T>(
    key: string,
    value: T,
    ttlSeconds = this.config.brapi.cacheTtlSeconds,
  ): void {
    this.cache.set(key, {
      value,
      expiresAt: this.clock().getTime() + ttlSeconds * 1000,
    });
  }

  private canUseRealData(): boolean {
    return (
      this.config.provider === "brapi" &&
      this.config.allowRealData &&
      Boolean(this.config.brapi.apiToken)
    );
  }

  private activeProviderName(): MarketDataProviderName {
    return this.config.provider === "brapi" ? "brapi" : "mock";
  }

  private resolveStatus(realDataEnabled: boolean, hasToken: boolean) {
    if (!realDataEnabled || !hasToken) {
      return "mock_only";
    }
    if (
      this.lastFallbackAt &&
      this.lastFallbackAt > (this.lastSuccessfulFetchAt ?? "")
    ) {
      return "degraded";
    }
    return this.lastSuccessfulFetchAt ? "ok" : "degraded";
  }

  private allowedAssets(): MarketAsset[] {
    const allowed = new Set(
      this.config.brapi.allowedSymbols.map((symbol) => symbol.toUpperCase()),
    );
    return ALLOWED_MARKET_ASSETS.filter((asset) => allowed.has(asset.symbol));
  }

  private assetFor(symbol: string): MarketAsset {
    const asset = this.allowedAssets().find((item) => item.symbol === symbol);
    if (!asset) {
      throw new MarketValidationError(
        `Symbol ${symbol} is not allowed for the market data MVP.`,
      );
    }
    return asset;
  }

  private isTradableInFortuna(symbol: string, type: MarketAssetType): boolean {
    if (type === "UNKNOWN" || type === "TREASURY") {
      return false;
    }
    return this.getAllowedSymbols().includes(symbol);
  }

  private hash(input: string): number {
    let hash = 2_166_136_261;
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16_777_619);
    }
    return hash >>> 0;
  }
}

export class MarketValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarketValidationError";
  }
}

class BrapiHttpError extends Error {
  constructor(
    readonly status: number,
    readonly statusText: string,
  ) {
    super(`brapi HTTP ${status}: ${statusText}`);
    this.name = "BrapiHttpError";
  }
}

class BrapiTimeoutError extends Error {
  constructor() {
    super("brapi request timed out.");
    this.name = "BrapiTimeoutError";
  }
}

class InvalidBrapiResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidBrapiResponseError";
  }
}

export function toCents(value: number): number {
  return Math.max(1, Math.round(value * 100));
}

export function toOptionalCents(value: number | undefined): number | undefined {
  return value === undefined ? undefined : Math.max(0, Math.round(value * 100));
}

export function normalizeMarketSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

export function mapBrapiSubTypeToMarketAssetType(
  subType: string | undefined,
  logger?: LoggerPort,
): MarketAssetType {
  const normalized = subType?.trim().toLowerCase();
  switch (normalized) {
    case "stock":
      return "STOCK";
    case "unit":
      return "UNIT";
    case "fii":
      return "FII";
    case "etf":
      return "ETF";
    case "fi-infra":
      return "FI_INFRA";
    case "fi-agro":
      return "FI_AGRO";
    case "fip":
      return "FIP";
    case "fidc":
      return "FIDC";
    case "bdr":
      return "BDR";
    default:
      logger?.warn("Unknown brapi asset subtype", {
        module: "market_data",
        action: "market_data_unknown_brapi_subtype",
        context: {
          provider: "brapi",
          hasSubType: normalized !== undefined && normalized.length > 0,
        },
      });
      return "UNKNOWN";
  }
}

export function marketAssetGroupForType(
  type: MarketAssetType,
): MarketAssetGroup {
  switch (type) {
    case "STOCK":
    case "UNIT":
    case "BDR":
      return "EQUITIES";
    case "FII":
      return "REAL_ESTATE_FUNDS";
    case "ETF":
      return "EXCHANGE_TRADED_FUNDS";
    case "FI_INFRA":
    case "FI_AGRO":
    case "FIP":
    case "FIDC":
      return "OTHER_LISTED_FUNDS";
    case "TREASURY":
      return "FIXED_INCOME";
    case "UNKNOWN":
      return "UNKNOWN";
  }
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function catalogSortValue(
  item: MarketCatalogItem,
  sortBy: MarketCatalogSortBy,
): string | number | undefined {
  switch (sortBy) {
    case "name":
      return item.name;
    case "price":
      return item.priceCents;
    case "changePercent":
      return item.changePercent;
    case "volume":
      return item.volume;
    case "marketCap":
      return item.marketCapCents;
  }
}

function compareCatalogValues(
  left: string | number,
  right: string | number,
): number {
  if (typeof left === "string" && typeof right === "string") {
    return left.localeCompare(right);
  }
  return Number(left) - Number(right);
}

function dedupeCatalogItemsBySymbol(
  items: MarketCatalogItem[],
): MarketCatalogItem[] {
  const seen = new Set<string>();
  const deduped: MarketCatalogItem[] = [];
  for (const item of items) {
    if (!seen.has(item.symbol)) {
      seen.add(item.symbol);
      deduped.push(item);
    }
  }
  return deduped;
}

function inferItemCount(value: unknown): number | undefined {
  if (Array.isArray(value)) {
    return value.length;
  }
  if (
    value &&
    typeof value === "object" &&
    "items" in value &&
    Array.isArray((value as { items?: unknown }).items)
  ) {
    return (value as { items: unknown[] }).items.length;
  }
  return undefined;
}

function markCatalogCacheSource<T>(value: T): T {
  if (
    value &&
    typeof value === "object" &&
    "source" in value &&
    "items" in value
  ) {
    return {
      ...value,
      source: "CACHE",
      delayed: true,
      items: Array.isArray((value as { items?: unknown }).items)
        ? (value as { items: unknown[] }).items.map((item) =>
            item && typeof item === "object" ? { ...item } : item,
          )
        : [],
    } as T;
  }
  return value;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const limit = Math.max(1, Math.trunc(concurrency));
  const results: R[] = [];
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]!);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

function normalizeMarketTime(
  value: string | number | undefined,
  fallback: Date,
): string {
  if (typeof value === "number") {
    return new Date(value * 1000).toISOString();
  }
  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  return fallback.toISOString();
}

function normalizeHistoryDate(value: string | number): string {
  if (typeof value === "number") {
    return new Date(value * 1000).toISOString().slice(0, 10);
  }
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }
  return value;
}

function rangeToDays(range: MarketHistoryRange): number {
  switch (range) {
    case "1mo":
      return 30;
    case "3mo":
      return 90;
    case "6mo":
      return 180;
    case "1y":
      return 365;
    default:
      return 30;
  }
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
