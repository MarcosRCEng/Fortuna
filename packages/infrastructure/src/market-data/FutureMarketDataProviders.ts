import {
  type Asset,
  type AssetHistoryPoint,
  type AssetPrice,
  type EducationalAssetInfo,
  type ExpectedYield,
  type LoggerPort,
  type MarketDataProvider,
  MarketDataProviderType,
  MarketDataSource,
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
}

export class CachedMarketDataProvider implements MarketDataProvider {
  private readonly ttlMs: number;
  private readonly enabled: boolean;
  private readonly clock: () => Date;
  private readonly cache = new Map<string, { expiresAt: number; value: unknown }>();

  constructor(
    private readonly inner: MarketDataProvider,
    options: CachedMarketDataProviderOptions = {},
  ) {
    this.ttlMs = Math.max(0, options.ttlSeconds ?? 60) * 1000;
    this.enabled = options.enabled ?? true;
    this.clock = options.clock ?? (() => new Date());
  }

  getProviderName(): string {
    return `CachedMarketDataProvider(${this.inner.getProviderName()})`;
  }

  getProviderType(): MarketDataProviderType {
    return MarketDataProviderType.CACHE;
  }

  listAssets(): Promise<Asset[]> {
    return this.memo("listAssets", () => this.inner.listAssets());
  }

  getAssetById(assetId: string): Promise<Asset | null> {
    return this.memo(`asset:${assetId}`, () => this.inner.getAssetById(assetId));
  }

  getAsset(symbol: string): Promise<Asset | undefined> {
    return this.memo(`asset-symbol:${symbol}`, () => this.inner.getAsset(symbol));
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
    return this.memo(`yield-id:${assetId}`, () => this.inner.getYieldInfo(assetId));
  }

  getExpectedYield(symbol: string): Promise<ExpectedYield | undefined> {
    return this.memo(`yield:${symbol}`, () => this.inner.getExpectedYield(symbol));
  }

  getEducationalInfo(symbol: string): Promise<EducationalAssetInfo | undefined> {
    return this.memo(`education:${symbol}`, () =>
      this.inner.getEducationalInfo(symbol),
    );
  }

  async refreshPrices(request?: RefreshMarketPricesRequest): Promise<Asset[]> {
    this.cache.clear();
    return this.inner.refreshPrices(request);
  }

  getProviderStatus(): Promise<MarketProviderStatus> {
    return this.inner.getProviderStatus();
  }

  private async memo<T>(key: string, loader: () => Promise<T>): Promise<T> {
    if (!this.enabled || this.ttlMs === 0) {
      return loader();
    }
    const now = this.clock().getTime();
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > now) {
      return hit.value as T;
    }
    const value = await loader();
    this.cache.set(key, { expiresAt: now + this.ttlMs, value });
    return value;
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

  listAssets(): Promise<Asset[]> {
    return this.withFallback("listAssets", () => this.primary.listAssets(), () =>
      this.secondary.listAssets(),
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
        (this.primary as unknown as { getCurrentPrice(input: unknown): Promise<unknown> }).getCurrentPrice(
          symbolOrAsset,
        ),
      () =>
        (this.secondary as unknown as { getCurrentPrice(input: unknown): Promise<unknown> }).getCurrentPrice(
          symbolOrAsset,
        ),
      context,
    ) as Promise<AssetPrice | MarketPrice | undefined>;
  }

  getCurrentPrices(assets: DomainAsset[]): Promise<MarketPrice[]> {
    return this.withFallback(
      "getCurrentPrices",
      () =>
        (this.primary as unknown as { getCurrentPrices(input: DomainAsset[]): Promise<MarketPrice[]> }).getCurrentPrices(
          assets,
        ),
      () =>
        (this.secondary as unknown as { getCurrentPrices(input: DomainAsset[]): Promise<MarketPrice[]> }).getCurrentPrices(
          assets,
        ),
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

  getEducationalInfo(symbol: string): Promise<EducationalAssetInfo | undefined> {
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
          action,
          primaryProvider: this.primary.getProviderName(),
          secondaryProvider: this.secondary.getProviderName(),
          reason:
            error instanceof Error ? error.name : "UnknownProviderFailure",
          ...context,
        },
      });
      return secondaryCall();
    }
  }
}

export class BrapiMarketDataProvider extends ExternalMarketDataProvider {}
export class B3MarketDataProvider extends ExternalMarketDataProvider {}
export class GoogleFinanceMarketDataProvider extends ExternalMarketDataProvider {}
export class MsnMoneyMarketDataProvider extends ExternalMarketDataProvider {}
export class CompositeMarketDataProvider extends FallbackMarketDataProvider {}
