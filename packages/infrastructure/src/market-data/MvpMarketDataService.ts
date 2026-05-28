import type {
  HistoricalPrice,
  MarketAsset,
  MarketDataProviderName,
  MarketHistoryInterval,
  MarketHistoryRange,
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
    assetType: "stock",
    currency: "BRL",
  },
  { symbol: "VALE3", name: "Vale ON", assetType: "stock", currency: "BRL" },
  {
    symbol: "ITUB4",
    name: "Itau Unibanco PN",
    assetType: "stock",
    currency: "BRL",
  },
  {
    symbol: "MGLU3",
    name: "Magazine Luiza ON",
    assetType: "stock",
    currency: "BRL",
  },
];

const VALID_RANGES = new Set<MarketHistoryRange>(["1mo", "3mo", "6mo", "1y"]);
const VALID_INTERVALS = new Set<MarketHistoryInterval>(["1d"]);

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
      lastSuccessfulFetchAt: this.lastSuccessfulFetchAt,
      status: this.resolveStatus(realDataEnabled, hasToken),
    };
  }

  getAllowedSymbols(): string[] {
    return this.allowedAssets().map((asset) => asset.symbol);
  }

  private async withMockFallback<T>(
    action: string,
    realLoader: () => Promise<T>,
    mockLoader: () => T,
    context: Record<string, unknown>,
  ): Promise<T> {
    if (!this.canUseRealData()) {
      return mockLoader();
    }

    try {
      const value = await realLoader();
      this.lastSuccessfulFetchAt = this.clock().toISOString();
      return value;
    } catch (error) {
      this.lastFallbackAt = this.clock().toISOString();
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
      return mockLoader();
    }
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
      });
    }
    return points;
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

  private getCached<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry || entry.expiresAt <= this.clock().getTime()) {
      return undefined;
    }
    return entry.value as T;
  }

  private setCached<T>(key: string, value: T): void {
    this.cache.set(key, {
      value,
      expiresAt:
        this.clock().getTime() + this.config.brapi.cacheTtlSeconds * 1000,
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
