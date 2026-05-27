import {
  type Asset,
  type AssetHistoryPoint,
  type AssetPrice,
  EDUCATIONAL_MARKET_DATA_DISCLAIMER,
  type EducationalAssetInfo,
  type ExpectedYield,
  type GetHistoricalPricesInput,
  type GetHistoricalPricesOutput,
  type GetQuotesInput,
  type GetQuotesOutput,
  type LoggerPort,
  type MarketDataProvider,
  MarketDataErrorCode,
  MarketDataProviderType,
  MarketDataSource,
  type MarketDataTrace,
  type MarketProviderStatus,
  MarketSessionStatus,
  type MarketQuote,
  PriceStatus,
  type PriceHistoryOptions,
  type PriceHistoryRequest,
  type RefreshMarketPricesRequest,
} from "@fortuna/application";
import type { Asset as DomainAsset, MarketPrice } from "@fortuna/domain";

export class ExternalMarketDataProviderNotConfiguredError extends Error {
  constructor() {
    super(
      "External market data provider is not configured. Set EXTERNAL_MARKET_DATA_ENABLED=true and provide a real adapter only after compliance review.",
    );
    this.name = "ExternalMarketDataProviderNotConfiguredError";
  }
}

export class MarketDataProviderUnavailableError extends Error {
  constructor(
    message: string,
    public readonly providerName: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "MarketDataProviderUnavailableError";
  }
}

export class ExternalMarketDataProvider implements MarketDataProvider {
  getProviderName(): string {
    return "ExternalMarketDataProvider";
  }

  getProviderType(): MarketDataProviderType {
    return MarketDataProviderType.EXTERNAL;
  }

  getQuotes(_input: GetQuotesInput): Promise<GetQuotesOutput> {
    return this.notConfigured();
  }

  getHistoricalPrices(
    _input: GetHistoricalPricesInput,
  ): Promise<GetHistoricalPricesOutput> {
    return this.notConfigured();
  }

  listAssets(): Promise<Asset[]> {
    return this.notConfigured();
  }

  getAssetById(_assetId: string): Promise<Asset | null> {
    return this.notConfigured();
  }

  getAsset(_symbol: string): Promise<Asset | undefined> {
    return this.notConfigured();
  }

  getCurrentPrice(_symbol: string): Promise<AssetPrice | undefined> {
    return this.notConfigured();
  }

  getQuote(_symbol: string): Promise<MarketQuote> {
    return this.notConfigured();
  }

  getPriceHistory(
    _requestOrAssetId: PriceHistoryRequest | string,
    _options?: PriceHistoryOptions,
  ): Promise<AssetHistoryPoint[]> {
    return this.notConfigured();
  }

  getYieldInfo(_assetId: string): Promise<ExpectedYield | null> {
    return this.notConfigured();
  }

  getExpectedYield(_symbol: string): Promise<ExpectedYield | undefined> {
    return this.notConfigured();
  }

  getEducationalInfo(
    _symbol: string,
  ): Promise<EducationalAssetInfo | undefined> {
    return this.notConfigured();
  }

  refreshPrices(_request?: RefreshMarketPricesRequest): Promise<Asset[]> {
    return this.notConfigured();
  }

  async getProviderStatus(): Promise<MarketProviderStatus> {
    return {
      sessionStatus: MarketSessionStatus.PROVIDER_FAILURE,
      dataSource: MarketDataSource.EXTERNAL,
      priceStatus: PriceStatus.UNAVAILABLE,
      checkedAt: new Date(),
      message:
        "External provider placeholder is disabled in the MVP. No real market integration is configured.",
    };
  }

  private notConfigured<T>(): Promise<T> {
    return Promise.reject(new ExternalMarketDataProviderNotConfiguredError());
  }
}

export interface CachedMarketDataProviderOptions {
  ttlSeconds?: number;
  enabled?: boolean;
  clock?: () => Date;
  logger?: LoggerPort;
}

export class CachedMarketDataProvider implements MarketDataProvider {
  private readonly ttlMs: number;
  private readonly enabled: boolean;
  private readonly clock: () => Date;
  private readonly logger?: LoggerPort;
  private readonly cache = new Map<
    string,
    { expiresAt: number; value: unknown }
  >();

  constructor(
    private readonly inner: MarketDataProvider,
    options: CachedMarketDataProviderOptions = {},
  ) {
    this.ttlMs = Math.max(0, options.ttlSeconds ?? 60) * 1000;
    this.enabled = options.enabled ?? true;
    this.clock = options.clock ?? (() => new Date());
    this.logger = options.logger;
  }

  getProviderName(): string {
    return `CachedMarketDataProvider(${this.inner.getProviderName()})`;
  }

  getProviderType(): MarketDataProviderType {
    return MarketDataProviderType.CACHE;
  }

  async getQuotes(input: GetQuotesInput): Promise<GetQuotesOutput> {
    const result = await this.memoWithHit(
      `quotes:${this.normalizeSymbols(input.symbols).join(",")}`,
      () => this.inner.getQuotes(input),
    );
    const output = result.value;
    if (!result.fromCache) {
      return output;
    }
    return {
      ...output,
      quotes: output.quotes.map((quote) => ({
        ...quote,
        trace: this.cacheTrace(quote.trace),
      })),
      trace: this.cacheTrace(output.trace),
    };
  }

  async getHistoricalPrices(
    input: GetHistoricalPricesInput,
  ): Promise<GetHistoricalPricesOutput> {
    const result = await this.memoWithHit(
      `historical-prices:${input.symbol}:${input.from?.toISOString() ?? ""}:${input.to?.toISOString() ?? ""}:${input.range ?? ""}:${input.interval ?? ""}`,
      () => this.inner.getHistoricalPrices(input),
    );
    const output = result.value;
    if (!result.fromCache) {
      return output;
    }
    return {
      ...output,
      trace: this.cacheTrace(output.trace),
    };
  }

  listAssets(): Promise<Asset[]> {
    return this.memo("listAssets", () => this.inner.listAssets());
  }

  getAssetById(assetId: string): Promise<Asset | null> {
    return this.memo(`asset:${assetId}`, () =>
      this.inner.getAssetById(assetId),
    );
  }

  getAsset(symbol: string): Promise<Asset | undefined> {
    return this.memo(`asset-symbol:${symbol}`, () =>
      this.inner.getAsset(symbol),
    );
  }

  getCurrentPrice(symbol: string): Promise<AssetPrice | undefined>;
  getCurrentPrice(asset: DomainAsset): Promise<MarketPrice>;
  getCurrentPrice(
    symbolOrAsset: string | DomainAsset,
  ): Promise<AssetPrice | MarketPrice | undefined> {
    if (typeof symbolOrAsset !== "string") {
      const priceProvider = this.inner as unknown as {
        getCurrentPrice(asset: DomainAsset): Promise<MarketPrice>;
      };
      return this.memo(`domain-price:${symbolOrAsset.id}`, () =>
        priceProvider.getCurrentPrice(symbolOrAsset),
      );
    }

    return this.memo(`price:${symbolOrAsset}`, () =>
      this.inner.getCurrentPrice(symbolOrAsset),
    );
  }

  getCurrentPrices(assets: DomainAsset[]): Promise<MarketPrice[]> {
    const priceProvider = this.inner as unknown as {
      getCurrentPrices(assets: DomainAsset[]): Promise<MarketPrice[]>;
    };
    return priceProvider.getCurrentPrices(assets);
  }

  getQuote(symbol: string): Promise<MarketQuote> {
    return this.memo(`quote:${symbol}`, () => this.inner.getQuote(symbol));
  }

  getPriceHistory(
    requestOrAssetId: PriceHistoryRequest | string,
    options?: PriceHistoryOptions,
  ): Promise<AssetHistoryPoint[]> {
    const key =
      typeof requestOrAssetId === "string"
        ? `history:${requestOrAssetId}:${options?.from?.toISOString() ?? ""}:${options?.to?.toISOString() ?? ""}`
        : `history:${requestOrAssetId.symbol}:${requestOrAssetId.from.toISOString()}:${requestOrAssetId.to.toISOString()}`;
    return this.memo(key, () =>
      typeof requestOrAssetId === "string"
        ? this.inner.getPriceHistory(requestOrAssetId, options)
        : this.inner.getPriceHistory(requestOrAssetId),
    );
  }

  getYieldInfo(assetId: string): Promise<ExpectedYield | null> {
    return this.memo(`yield-id:${assetId}`, () =>
      this.inner.getYieldInfo(assetId),
    );
  }

  getExpectedYield(symbol: string): Promise<ExpectedYield | undefined> {
    return this.memo(`yield:${symbol}`, () =>
      this.inner.getExpectedYield(symbol),
    );
  }

  getEducationalInfo(
    symbol: string,
  ): Promise<EducationalAssetInfo | undefined> {
    return this.memo(`education:${symbol}`, () =>
      this.inner.getEducationalInfo(symbol),
    );
  }

  async refreshPrices(request?: RefreshMarketPricesRequest): Promise<Asset[]> {
    return this.memo("refreshPrices", () => this.inner.refreshPrices(request));
  }

  getProviderStatus(): Promise<MarketProviderStatus> {
    return this.inner.getProviderStatus();
  }

  private async memo<T>(key: string, loader: () => Promise<T>): Promise<T> {
    return (await this.memoWithHit(key, loader)).value;
  }

  private async memoWithHit<T>(
    key: string,
    loader: () => Promise<T>,
  ): Promise<{ value: T; fromCache: boolean }> {
    if (!this.enabled || this.ttlMs === 0) {
      return { value: await loader(), fromCache: false };
    }
    const now = this.clock().getTime();
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > now) {
      this.logger?.info("Market data cache hit", {
        module: "market_data",
        action: "market_data_cache_hit",
        correlationId: "pending-request-context",
        context: {
          provider: this.inner.getProviderName(),
          key,
          cacheTtlSeconds: this.ttlMs / 1000,
        },
      });
      return { value: hit.value as T, fromCache: true };
    }
    this.logger?.info("Market data cache miss", {
      module: "market_data",
      action: "market_data_cache_miss",
      correlationId: "pending-request-context",
      context: {
        provider: this.inner.getProviderName(),
        key,
        cacheTtlSeconds: this.ttlMs / 1000,
      },
    });
    const value = await loader();
    this.cache.set(key, { expiresAt: now + this.ttlMs, value });
    return { value, fromCache: false };
  }

  private cacheTrace(trace: MarketDataTrace): MarketDataTrace {
    return {
      ...trace,
      source: "cache",
      providerName: this.getProviderName(),
      isCached: true,
      fetchedAt: this.clock(),
    };
  }

  private normalizeSymbols(symbols: string[]): string[] {
    return [
      ...new Set(
        symbols
          .map((symbol) => symbol.trim().toUpperCase())
          .filter((symbol) => symbol.length > 0),
      ),
    ];
  }
}

export class FallbackMarketDataProvider implements MarketDataProvider {
  constructor(
    private readonly primary: MarketDataProvider,
    private readonly secondary: MarketDataProvider,
    private readonly logger?: LoggerPort,
  ) {}

  getProviderName(): string {
    return `FallbackMarketDataProvider(${this.primary.getProviderName()} -> ${this.secondary.getProviderName()})`;
  }

  getProviderType(): MarketDataProviderType {
    return MarketDataProviderType.FALLBACK;
  }

  getQuotes(input: GetQuotesInput): Promise<GetQuotesOutput> {
    return this.withFallback(
      "getQuotes",
      async () =>
        this.ensureQuotesAvailable(await this.primary.getQuotes(input)),
      async () =>
        this.markQuotesAsFallback(await this.secondary.getQuotes(input)),
      { symbols: input.symbols },
    );
  }

  getHistoricalPrices(
    input: GetHistoricalPricesInput,
  ): Promise<GetHistoricalPricesOutput> {
    return this.withFallback(
      "getHistoricalPrices",
      async () =>
        this.ensureHistoryAvailable(
          await this.primary.getHistoricalPrices(input),
        ),
      async () =>
        this.markHistoryAsFallback(
          await this.secondary.getHistoricalPrices(input),
        ),
      { symbol: input.symbol },
    );
  }

  listAssets(): Promise<Asset[]> {
    return this.withFallback(
      "listAssets",
      () => this.primary.listAssets(),
      () => this.secondary.listAssets(),
    );
  }

  getAssetById(assetId: string): Promise<Asset | null> {
    return this.withFallback(
      "getAssetById",
      () => this.primary.getAssetById(assetId),
      () => this.secondary.getAssetById(assetId),
      { assetId },
    );
  }

  getAsset(symbol: string): Promise<Asset | undefined> {
    return this.withFallback(
      "getAsset",
      () => this.primary.getAsset(symbol),
      () => this.secondary.getAsset(symbol),
      { symbol },
    );
  }

  getCurrentPrice(symbol: string): Promise<AssetPrice | undefined>;
  getCurrentPrice(asset: DomainAsset): Promise<MarketPrice>;
  getCurrentPrice(
    symbolOrAsset: string | DomainAsset,
  ): Promise<AssetPrice | MarketPrice | undefined> {
    const context =
      typeof symbolOrAsset === "string"
        ? { symbol: symbolOrAsset }
        : { assetId: symbolOrAsset.id, symbol: symbolOrAsset.symbol.value };
    return this.withFallback(
      "getCurrentPrice",
      () =>
        (
          this.primary as unknown as {
            getCurrentPrice(input: unknown): Promise<unknown>;
          }
        ).getCurrentPrice(symbolOrAsset),
      () =>
        (
          this.secondary as unknown as {
            getCurrentPrice(input: unknown): Promise<unknown>;
          }
        ).getCurrentPrice(symbolOrAsset),
      context,
    ) as Promise<AssetPrice | MarketPrice | undefined>;
  }

  getCurrentPrices(assets: DomainAsset[]): Promise<MarketPrice[]> {
    return this.withFallback(
      "getCurrentPrices",
      () =>
        (
          this.primary as unknown as {
            getCurrentPrices(input: DomainAsset[]): Promise<MarketPrice[]>;
          }
        ).getCurrentPrices(assets),
      () =>
        (
          this.secondary as unknown as {
            getCurrentPrices(input: DomainAsset[]): Promise<MarketPrice[]>;
          }
        ).getCurrentPrices(assets),
      { assetCount: assets.length },
    );
  }

  getQuote(symbol: string): Promise<MarketQuote> {
    return this.withFallback(
      "getQuote",
      () => this.primary.getQuote(symbol),
      () => this.secondary.getQuote(symbol),
      { symbol },
    );
  }

  getPriceHistory(
    requestOrAssetId: PriceHistoryRequest | string,
    options?: PriceHistoryOptions,
  ): Promise<AssetHistoryPoint[]> {
    const context =
      typeof requestOrAssetId === "string"
        ? { assetId: requestOrAssetId }
        : { symbol: requestOrAssetId.symbol };
    return this.withFallback(
      "getPriceHistory",
      () =>
        typeof requestOrAssetId === "string"
          ? this.primary.getPriceHistory(requestOrAssetId, options)
          : this.primary.getPriceHistory(requestOrAssetId),
      () =>
        typeof requestOrAssetId === "string"
          ? this.secondary.getPriceHistory(requestOrAssetId, options)
          : this.secondary.getPriceHistory(requestOrAssetId),
      context,
    );
  }

  getYieldInfo(assetId: string): Promise<ExpectedYield | null> {
    return this.withFallback(
      "getYieldInfo",
      () => this.primary.getYieldInfo(assetId),
      () => this.secondary.getYieldInfo(assetId),
      { assetId },
    );
  }

  getExpectedYield(symbol: string): Promise<ExpectedYield | undefined> {
    return this.withFallback(
      "getExpectedYield",
      () => this.primary.getExpectedYield(symbol),
      () => this.secondary.getExpectedYield(symbol),
      { symbol },
    );
  }

  getEducationalInfo(
    symbol: string,
  ): Promise<EducationalAssetInfo | undefined> {
    return this.withFallback(
      "getEducationalInfo",
      () => this.primary.getEducationalInfo(symbol),
      () => this.secondary.getEducationalInfo(symbol),
      { symbol },
    );
  }

  refreshPrices(request?: RefreshMarketPricesRequest): Promise<Asset[]> {
    return this.withFallback(
      "refreshPrices",
      () => this.primary.refreshPrices(request),
      () => this.secondary.refreshPrices(request),
    );
  }

  getProviderStatus(): Promise<MarketProviderStatus> {
    return this.withFallback(
      "getProviderStatus",
      () => this.primary.getProviderStatus(),
      () => this.secondary.getProviderStatus(),
    );
  }

  private async withFallback<T>(
    action: string,
    primaryCall: () => Promise<T>,
    secondaryCall: () => Promise<T>,
    context: Record<string, unknown> = {},
  ): Promise<T> {
    try {
      return await primaryCall();
    } catch (error) {
      this.logger?.warn("Market data provider fallback used", {
        module: "market_data",
        action: "market_provider_fallback_used",
        context: {
          auditEventType: "MARKET_DATA_FALLBACK_USED",
          action,
          primaryProvider: this.primary.getProviderName(),
          secondaryProvider: this.secondary.getProviderName(),
          reason:
            error instanceof Error ? error.name : "UnknownProviderFailure",
          message: error instanceof Error ? error.message : undefined,
          ...context,
        },
      });
      return secondaryCall();
    }
  }

  private ensureQuotesAvailable(output: GetQuotesOutput): GetQuotesOutput {
    if (output.quotes.length > 0 || output.errors.length === 0) {
      return output;
    }
    if (!this.shouldFallback(output.errors)) {
      return output;
    }
    throw new MarketDataProviderUnavailableError(
      this.primaryFailureMessage(output.errors),
      output.trace.providerName,
      output.errors,
    );
  }

  private ensureHistoryAvailable(
    output: GetHistoricalPricesOutput,
  ): GetHistoricalPricesOutput {
    if (output.prices.length > 0 || output.errors.length === 0) {
      return output;
    }
    if (!this.shouldFallback(output.errors)) {
      return output;
    }
    throw new MarketDataProviderUnavailableError(
      this.primaryFailureMessage(output.errors),
      output.trace.providerName,
      output.errors,
    );
  }

  private primaryFailureMessage(
    errors: Array<{ code: MarketDataErrorCode; statusCode?: number }>,
  ): string {
    const [first] = errors;
    const status = first?.statusCode ? ` HTTP ${first.statusCode}` : "";
    return `Primary market data provider failed with ${first?.code ?? "UNKNOWN"}${status}.`;
  }

  private shouldFallback(
    errors: Array<{ code: MarketDataErrorCode; statusCode?: number }>,
  ): boolean {
    return errors.some((error) =>
      [
        MarketDataErrorCode.EMPTY_RESPONSE,
        MarketDataErrorCode.HTTP_ERROR,
        MarketDataErrorCode.TIMEOUT,
        MarketDataErrorCode.RATE_LIMITED,
        MarketDataErrorCode.MISSING_TOKEN,
        MarketDataErrorCode.PROVIDER_UNAVAILABLE,
        MarketDataErrorCode.INVALID_RESPONSE,
      ].includes(error.code),
    );
  }

  private markQuotesAsFallback(output: GetQuotesOutput): GetQuotesOutput {
    const trace = this.fallbackTrace(output.trace);
    return {
      ...output,
      trace,
      quotes: output.quotes.map((quote) => ({ ...quote, trace })),
      errors: [
        ...output.errors,
        {
          code: MarketDataErrorCode.PROVIDER_UNAVAILABLE,
          message:
            "Primary market data provider failed; fallback data was used.",
          providerName: this.getProviderName(),
        },
      ],
    };
  }

  private markHistoryAsFallback(
    output: GetHistoricalPricesOutput,
  ): GetHistoricalPricesOutput {
    return {
      ...output,
      trace: this.fallbackTrace(output.trace),
      errors: [
        ...output.errors,
        {
          code: MarketDataErrorCode.PROVIDER_UNAVAILABLE,
          message:
            "Primary market data provider failed; fallback data was used.",
          providerName: this.getProviderName(),
        },
      ],
    };
  }

  private fallbackTrace(trace: MarketDataTrace): MarketDataTrace {
    return {
      ...trace,
      source: "fallback",
      providerName: this.getProviderName(),
      isRealData: false,
      isFallback: true,
      fetchedAt: new Date(),
      disclaimer: EDUCATIONAL_MARKET_DATA_DISCLAIMER,
    };
  }
}

export class B3MarketDataProvider extends ExternalMarketDataProvider {}
export class GoogleFinanceMarketDataProvider extends ExternalMarketDataProvider {}
export class MsnMoneyMarketDataProvider extends ExternalMarketDataProvider {}
export class CompositeMarketDataProvider extends FallbackMarketDataProvider {}
