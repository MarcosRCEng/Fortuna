import type {
  HistoricalPrice,
  HistoricalPriceInput,
  MarketAsset,
  MarketAssetType,
  MarketDataProvider,
  MarketDataProviderStatus,
  MarketHistoryInterval,
  MarketHistoryRange,
  MarketQuote,
} from "@fortuna/domain";
import type { LoggerPort } from "@fortuna/application";
import type { MarketDataConfig } from "../config/MarketDataConfig.js";
import { readMarketDataConfig } from "../config/MarketDataConfig.js";

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

type CachePort = {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlSeconds: number): void;
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

type BrapiQuoteResponse = {
  results?: BrapiQuote[];
};

type BrapiQuote = {
  symbol?: string;
  shortName?: string;
  longName?: string;
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

export interface MarketDataProviderRuntimeOptions {
  config?: MarketDataConfig;
  fetch?: FetchLike;
  logger?: LoggerPort;
  auditLogger?: LoggerPort;
  clock?: () => Date;
}

export class InMemoryMarketDataCache implements CachePort {
  private readonly entries = new Map<string, CacheEntry<unknown>>();

  constructor(private readonly clock: () => Date = () => new Date()) {}

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry || entry.expiresAt <= this.clock().getTime()) {
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    this.entries.set(key, {
      value,
      expiresAt: this.clock().getTime() + Math.max(900, ttlSeconds) * 1000,
    });
  }
}

export class MockMarketDataProvider implements MarketDataProvider {
  constructor(private readonly clock: () => Date = () => new Date()) {}

  async getQuote(symbol: string): Promise<MarketQuote> {
    return this.getMockQuote(normalizeSymbol(symbol));
  }

  async getQuotes(symbols: string[]): Promise<MarketQuote[]> {
    return normalizeSymbols(symbols).map((symbol) => this.getMockQuote(symbol));
  }

  async getHistoricalPrices(
    symbol: string,
    input: HistoricalPriceInput = {},
  ): Promise<HistoricalPrice[]> {
    const normalized = normalizeSymbol(symbol);
    const days = rangeToDays(input.range ?? "1mo");
    const end = startOfUtcDay(this.clock());
    const points: HistoricalPrice[] = [];

    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const date = addDays(end, -offset);
      const close = mockCloseInCents(normalized, date);
      const open = mockCloseInCents(normalized, addDays(date, -1));
      const spread = Math.max(1, Math.trunc(close * 0.008));
      points.push({
        symbol: normalized,
        date: date.toISOString().slice(0, 10),
        openInCents: open,
        highInCents: Math.max(open, close) + spread,
        lowInCents: Math.max(1, Math.min(open, close) - spread),
        closeInCents: close,
        volume:
          1_000_000 +
          (hash(`fortuna:${normalized}:${date.toISOString()}:volume`) %
            500_000),
        provider: "mock",
        isRealData: false,
      });
    }

    return points;
  }

  async getProviderStatus(): Promise<MarketDataProviderStatus> {
    return {
      provider: "mock",
      isAvailable: true,
      isRealDataEnabled: false,
      isUsingFallback: false,
      cacheEnabled: false,
      lastSuccessfulRequestAt: this.clock().toISOString(),
    };
  }

  private getMockQuote(symbol: string): MarketQuote {
    const asset = assetFor(symbol);
    const priceInCents = mockCloseInCents(symbol, this.clock());
    const previousClose = mockCloseInCents(symbol, addDays(this.clock(), -1));
    return {
      ...asset,
      priceInCents,
      regularMarketChangePercent:
        previousClose <= 0
          ? 0
          : Number((((priceInCents - previousClose) / previousClose) * 100).toFixed(2)),
      regularMarketChangeInCents: priceInCents - previousClose,
      regularMarketPreviousCloseInCents: previousClose,
      marketTime: this.clock().toISOString(),
      provider: "mock",
      isRealData: false,
      isDelayed: false,
    };
  }
}

export class BrapiMarketDataProvider implements MarketDataProvider {
  private readonly fetchImpl: FetchLike;
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly timeoutMs: number;
  private readonly maxSymbolsPerRequest: number;
  private readonly allowRealData: boolean;
  private readonly allowedSymbols: string[];
  private lastSuccessfulRequestAt?: string;
  private lastFailureAt?: string;
  private lastFailureReason?: string;

  constructor(
    config: MarketDataConfig,
    private readonly logger?: LoggerPort,
    fetchImpl: FetchLike = fetch,
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.fetchImpl = fetchImpl;
    this.baseUrl = config.brapi.baseUrl.replace(/\/+$/, "");
    this.token = config.brapi.apiToken;
    this.timeoutMs = config.brapi.timeoutMs;
    this.maxSymbolsPerRequest = config.brapi.maxSymbolsPerRequest;
    this.allowRealData = config.provider === "brapi" && config.allowRealData;
    this.allowedSymbols = config.brapi.allowedSymbols;
  }

  async getQuote(symbol: string): Promise<MarketQuote> {
    const [quote] = await this.getQuotes([symbol]);
    if (!quote) {
      throw new InvalidMarketDataResponseError("brapi returned no quote.");
    }
    return quote;
  }

  async getQuotes(symbols: string[]): Promise<MarketQuote[]> {
    const normalized = normalizeSymbols(symbols);
    this.assertCanUseRealData(normalized);
    if (normalized.length > this.maxSymbolsPerRequest) {
      throw new MarketDataProviderRequestError(
        `brapi request exceeds ${this.maxSymbolsPerRequest} symbol(s).`,
      );
    }

    const payload = await this.fetchPayload(normalized);
    const quotes = (payload.results ?? []).map((quote) => this.mapQuote(quote));
    if (quotes.length === 0) {
      throw new InvalidMarketDataResponseError("brapi returned no quotes.");
    }
    this.lastSuccessfulRequestAt = this.clock().toISOString();
    return quotes;
  }

  async getHistoricalPrices(
    symbol: string,
    input: HistoricalPriceInput = {},
  ): Promise<HistoricalPrice[]> {
    const normalized = normalizeSymbol(symbol);
    this.assertCanUseRealData([normalized]);
    const payload = await this.fetchPayload([normalized], {
      range: input.range ?? "1mo",
      interval: input.interval ?? "1d",
    });
    const points = payload.results?.[0]?.historicalDataPrice ?? [];
    const history = points.map((point) => this.mapHistoricalPoint(normalized, point));
    if (history.length === 0) {
      throw new InvalidMarketDataResponseError("brapi returned no historical prices.");
    }
    this.lastSuccessfulRequestAt = this.clock().toISOString();
    return history;
  }

  async getProviderStatus(): Promise<MarketDataProviderStatus> {
    return {
      provider: "brapi",
      isAvailable: this.allowRealData && Boolean(this.token),
      isRealDataEnabled: this.allowRealData,
      isUsingFallback: false,
      cacheEnabled: false,
      lastSuccessfulRequestAt: this.lastSuccessfulRequestAt,
      lastFailureAt: this.lastFailureAt,
      lastFailureReason: this.lastFailureReason,
    };
  }

  private async fetchPayload(
    symbols: string[],
    params: Record<string, string | undefined> = {},
  ): Promise<BrapiQuoteResponse> {
    const url = new URL(`${this.baseUrl}/quote/${symbols.join(",")}`);
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, {
        headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new MarketDataProviderRequestError(`brapi HTTP ${response.status}.`);
      }
      return (await response.json()) as BrapiQuoteResponse;
    } catch (error) {
      const reason =
        error instanceof Error && error.name === "AbortError"
          ? "brapi request timed out."
          : error instanceof Error
            ? error.message
            : "brapi provider failed.";
      this.lastFailureAt = this.clock().toISOString();
      this.lastFailureReason = reason;
      this.logger?.warn("Market data provider failed", {
        module: "market_data",
        action: "MarketDataProviderFailed",
        context: { provider: "brapi", reason },
      });
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private assertCanUseRealData(symbols: string[]): void {
    if (!this.allowRealData) {
      throw new MarketDataProviderRequestError("Real market data is disabled.");
    }
    if (!this.token) {
      throw new MarketDataProviderRequestError("BRAPI_API_TOKEN is required.");
    }
    const allowed = new Set(this.allowedSymbols.map((item) => item.toUpperCase()));
    const blocked = symbols.find((symbol) => !allowed.has(symbol));
    if (blocked) {
      throw new MarketValidationError(
        `Symbol ${blocked} is not allowed for the market data MVP.`,
      );
    }
  }

  private mapQuote(quote: BrapiQuote): MarketQuote {
    if (!quote.symbol || quote.regularMarketPrice === undefined) {
      throw new InvalidMarketDataResponseError("brapi quote is incomplete.");
    }
    const symbol = normalizeSymbol(quote.symbol);
    const asset = assetFor(symbol);
    const priceInCents = toCents(quote.regularMarketPrice);
    const previousClose =
      quote.regularMarketPreviousClose === undefined
        ? undefined
        : toCents(quote.regularMarketPreviousClose);
    return {
      ...asset,
      symbol,
      name: quote.longName ?? quote.shortName ?? asset.name,
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

  private mapHistoricalPoint(symbol: string, point: BrapiHistoricalPoint): HistoricalPrice {
    if (point.close === undefined || point.date === undefined) {
      throw new InvalidMarketDataResponseError("brapi historical point is incomplete.");
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
}

export class CachedMarketDataProvider implements MarketDataProvider {
  constructor(
    private readonly inner: MarketDataProvider,
    private readonly cache: CachePort,
    private readonly ttlSeconds = 900,
    private readonly logger?: LoggerPort,
  ) {}

  async getQuote(symbol: string): Promise<MarketQuote> {
    const [quote] = await this.getQuotes([symbol]);
    return quote;
  }

  async getQuotes(symbols: string[]): Promise<MarketQuote[]> {
    const normalized = normalizeSymbols(symbols).sort();
    return this.memo(`market:quotes:${normalized.join(",")}`, () =>
      this.inner.getQuotes(normalized),
    );
  }

  async getHistoricalPrices(
    symbol: string,
    input: HistoricalPriceInput = {},
  ): Promise<HistoricalPrice[]> {
    const normalized = normalizeSymbol(symbol);
    return this.memo(
      `market:history:${normalized}:${input.range ?? "1mo"}:${input.interval ?? "1d"}`,
      () => this.inner.getHistoricalPrices(normalized, input),
    );
  }

  async getProviderStatus(): Promise<MarketDataProviderStatus> {
    const status = await this.inner.getProviderStatus();
    return { ...status, cacheEnabled: true };
  }

  private async memo<T extends MarketQuote[] | HistoricalPrice[]>(
    key: string,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cached = this.cache.get<T>(key);
    if (cached) {
      this.logger?.info("Market data cache hit", {
        module: "market_data",
        action: "MarketDataCacheHit",
        context: { key },
      });
      return cached.map((item) => ({ ...item, provider: "cache" })) as T;
    }
    this.logger?.info("Market data cache miss", {
      module: "market_data",
      action: "MarketDataCacheMiss",
      context: { key },
    });
    const value = await loader();
    this.cache.set(key, value, this.ttlSeconds);
    return value;
  }
}

export class FallbackMarketDataProvider implements MarketDataProvider {
  private lastFailureAt?: string;
  private lastFailureReason?: string;
  private usingFallback = false;

  constructor(
    private readonly primary: MarketDataProvider,
    private readonly fallback: MarketDataProvider,
    private readonly logger?: LoggerPort,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  getQuote(symbol: string): Promise<MarketQuote> {
    return this.withFallback(() => this.primary.getQuote(symbol), () =>
      this.fallback.getQuote(symbol),
    );
  }

  async getQuotes(symbols: string[]): Promise<MarketQuote[]> {
    return this.withFallback(
      async () => {
        const normalized = normalizeSymbols(symbols);
        const quotes = await this.primary.getQuotes(normalized);
        const returned = new Set(quotes.map((quote) => quote.symbol));
        const missing = normalized.filter((symbol) => !returned.has(symbol));
        if (missing.length === 0) {
          return quotes;
        }
        const fallbackQuotes = await this.fallback.getQuotes(missing);
        return [...quotes, ...fallbackQuotes];
      },
      () => this.fallback.getQuotes(symbols),
    );
  }

  getHistoricalPrices(
    symbol: string,
    input: HistoricalPriceInput,
  ): Promise<HistoricalPrice[]> {
    return this.withFallback(
      () => this.primary.getHistoricalPrices(symbol, input),
      () => this.fallback.getHistoricalPrices(symbol, input),
    );
  }

  async getProviderStatus(): Promise<MarketDataProviderStatus> {
    const status = await this.primary.getProviderStatus();
    return {
      ...status,
      isUsingFallback: this.usingFallback,
      lastFailureAt: this.lastFailureAt ?? status.lastFailureAt,
      lastFailureReason: this.lastFailureReason ?? status.lastFailureReason,
    };
  }

  private async withFallback<T>(
    primaryCall: () => Promise<T>,
    fallbackCall: () => Promise<T>,
  ): Promise<T> {
    try {
      const value = await primaryCall();
      this.usingFallback = false;
      return value;
    } catch (error) {
      this.usingFallback = true;
      this.lastFailureAt = this.clock().toISOString();
      this.lastFailureReason =
        error instanceof Error ? error.message : "Unknown market data failure.";
      this.logger?.warn("Market data fallback used", {
        module: "market_data",
        action: "MarketDataFallbackUsed",
        context: {
          reason: this.lastFailureReason,
        },
      });
      return fallbackCall();
    }
  }
}

export class AuditedMarketDataProvider implements MarketDataProvider {
  constructor(
    private readonly inner: MarketDataProvider,
    private readonly auditLogger?: LoggerPort,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async getQuote(symbol: string): Promise<MarketQuote> {
    return this.audit("MarketQuoteRequested", [normalizeSymbol(symbol)], () =>
      this.inner.getQuote(symbol),
    );
  }

  async getQuotes(symbols: string[]): Promise<MarketQuote[]> {
    return this.audit("MarketQuotesRequested", normalizeSymbols(symbols), () =>
      this.inner.getQuotes(symbols),
    );
  }

  async getHistoricalPrices(
    symbol: string,
    input: HistoricalPriceInput,
  ): Promise<HistoricalPrice[]> {
    return this.audit("HistoricalPricesRequested", [normalizeSymbol(symbol)], () =>
      this.inner.getHistoricalPrices(symbol, input),
    );
  }

  getProviderStatus(): Promise<MarketDataProviderStatus> {
    return this.inner.getProviderStatus();
  }

  private async audit<T extends MarketQuote | MarketQuote[] | HistoricalPrice[]>(
    eventType: string,
    symbols: string[],
    call: () => Promise<T>,
  ): Promise<T> {
    const startedAt = this.clock().getTime();
    try {
      const result = await call();
      const rows = (Array.isArray(result) ? result : [result]) as Array<
        MarketQuote | HistoricalPrice
      >;
      this.auditLogger?.info("Market data audit event", {
        module: "market_data",
        action: eventType,
        context: {
          symbols,
          durationMs: this.clock().getTime() - startedAt,
          providers: [...new Set(rows.map((row) => row.provider))],
          containsRealData: rows.some((row) => row.isRealData),
        },
      });
      return result;
    } catch (error) {
      this.auditLogger?.warn("Market data audit failure", {
        module: "market_data",
        action: "MarketDataProviderFailed",
        context: {
          requestedEventType: eventType,
          symbols,
          durationMs: this.clock().getTime() - startedAt,
          reason: error instanceof Error ? error.message : "Unknown failure.",
        },
      });
      throw error;
    }
  }
}

export class MarketDataService {
  constructor(
    private readonly provider: MarketDataProvider,
    private readonly config: MarketDataConfig,
  ) {}

  listAssets(): MarketAsset[] {
    return allowedAssets(this.config);
  }

  async getQuote(symbol: string): Promise<MarketQuote> {
    const [normalized] = this.normalizeAndValidateSymbols([symbol]);
    return this.provider.getQuote(normalized);
  }

  async getQuotes(symbols: string[]): Promise<MarketQuote[]> {
    const normalized = this.normalizeAndValidateSymbols(symbols);
    if (normalized.length > this.config.brapi.maxSymbolsPerRequest) {
      throw new MarketValidationError(
        `At most ${this.config.brapi.maxSymbolsPerRequest} symbol(s) are accepted per request in the MVP.`,
      );
    }
    return this.provider.getQuotes(normalized);
  }

  async getHistoricalPrices(
    symbol: string,
    input: HistoricalPriceInput = {},
  ): Promise<HistoricalPrice[]> {
    const [normalized] = this.normalizeAndValidateSymbols([symbol]);
    assertValidRange(input.range ?? "1mo");
    assertValidInterval(input.interval ?? "1d");
    return this.provider.getHistoricalPrices(normalized, input);
  }

  getAllowedSymbols(): string[] {
    return allowedAssets(this.config).map((asset) => asset.symbol);
  }

  getProviderStatus(): Promise<MarketDataProviderStatus> {
    return this.provider.getProviderStatus();
  }

  private normalizeAndValidateSymbols(symbols: string[]): string[] {
    const normalized = normalizeSymbols(symbols);
    if (normalized.length === 0) {
      throw new MarketValidationError("symbols must be a non-empty comma-separated list.");
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
}

export function createComposedMarketDataService(
  options: MarketDataProviderRuntimeOptions = {},
): MarketDataService {
  const config = options.config ?? readMarketDataConfig().config;
  const mock = new MockMarketDataProvider(options.clock);
  const active =
    config.provider === "brapi" && config.allowRealData
      ? new FallbackMarketDataProvider(
          new CachedMarketDataProvider(
            new BrapiMarketDataProvider(
              config,
              options.logger,
              options.fetch,
              options.clock,
            ),
            new InMemoryMarketDataCache(options.clock),
            config.brapi.cacheTtlSeconds,
            options.logger,
          ),
          mock,
          options.logger,
          options.clock,
        )
      : mock;
  return new MarketDataService(
    new AuditedMarketDataProvider(active, options.auditLogger ?? options.logger, options.clock),
    config,
  );
}

export class MarketValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarketValidationError";
  }
}

class MarketDataProviderRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarketDataProviderRequestError";
  }
}

class InvalidMarketDataResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidMarketDataResponseError";
  }
}

const ALLOWED_MARKET_ASSETS: MarketAsset[] = [
  { symbol: "PETR4", name: "Petrobras PN", assetType: "stock", currency: "BRL" },
  { symbol: "VALE3", name: "Vale ON", assetType: "stock", currency: "BRL" },
  { symbol: "ITUB4", name: "Itau Unibanco PN", assetType: "stock", currency: "BRL" },
  { symbol: "MGLU3", name: "Magazine Luiza ON", assetType: "stock", currency: "BRL" },
];

function allowedAssets(config: MarketDataConfig): MarketAsset[] {
  const allowed = new Set(config.brapi.allowedSymbols.map((symbol) => symbol.toUpperCase()));
  return ALLOWED_MARKET_ASSETS.filter((asset) => allowed.has(asset.symbol));
}

function assetFor(symbol: string): MarketAsset {
  const asset = ALLOWED_MARKET_ASSETS.find((item) => item.symbol === symbol);
  if (asset) {
    return asset;
  }
  return {
    symbol,
    name: symbol,
    assetType: classifyAssetType(symbol),
    currency: "BRL",
  };
}

function classifyAssetType(symbol: string): MarketAssetType {
  if (symbol.startsWith("^")) {
    return "index";
  }
  if (symbol.endsWith("11")) {
    return "fii";
  }
  return "stock";
}

export function normalizeSymbols(symbols: string[]): string[] {
  return [
    ...new Set(
      symbols
        .flatMap((symbol) => symbol.split(","))
        .map((symbol) => normalizeSymbol(symbol))
        .filter((symbol) => symbol.length > 0),
    ),
  ];
}

function normalizeSymbol(symbol: string): string {
  const normalized = symbol.trim().toUpperCase();
  if (/\s/.test(normalized)) {
    throw new MarketValidationError("symbol must not contain internal whitespace.");
  }
  return normalized;
}

function assertValidRange(range: string): asserts range is MarketHistoryRange {
  if (!["1d", "5d", "1mo", "3mo", "6mo", "1y", "5y", "max"].includes(range)) {
    throw new MarketValidationError("range must be one of: 1d, 5d, 1mo, 3mo, 6mo, 1y, 5y, max.");
  }
}

function assertValidInterval(interval: string): asserts interval is MarketHistoryInterval {
  if (!["1d", "1wk", "1mo"].includes(interval)) {
    throw new MarketValidationError("interval must be one of: 1d, 1wk, 1mo.");
  }
}

export function toCents(value: number): number {
  return Math.max(1, Math.round(value * 100));
}

function mockCloseInCents(symbol: string, date: Date): number {
  const base =
    {
      PETR4: 3842,
      VALE3: 6210,
      ITUB4: 3425,
      MGLU3: 185,
    }[symbol] ?? 1000;
  const day = startOfUtcDay(date).toISOString().slice(0, 10);
  const centeredBps = (hash(`fortuna:${symbol}:${day}`) % 401) - 200;
  return Math.max(1, Math.trunc((base * (10_000 + centeredBps) + 5_000) / 10_000));
}

function normalizeMarketTime(value: string | number | undefined, fallback: Date): string {
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
    case "1d":
      return 1;
    case "5d":
      return 5;
    case "3mo":
      return 90;
    case "6mo":
      return 180;
    case "1y":
      return 365;
    case "5y":
      return 365 * 5;
    case "max":
      return 365;
    case "1mo":
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
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function hash(input: string): number {
  let value = 2_166_136_261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16_777_619);
  }
  return value >>> 0;
}
