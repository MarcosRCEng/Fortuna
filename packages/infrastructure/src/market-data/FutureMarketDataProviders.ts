import {
  type Asset,
  type AssetHistoryPoint,
  type AssetPrice,
  type EducationalAssetInfo,
  type ExpectedYield,
  type MarketDataProvider,
  MarketDataSource,
  type MarketProviderStatus,
  MarketSessionStatus,
  type MarketQuote,
  PriceStatus,
  type PriceHistoryRequest,
  type RefreshMarketPricesRequest,
} from "@fortuna/application";

abstract class PlannedMarketDataProvider implements MarketDataProvider {
  protected constructor(
    protected readonly providerName: string,
    protected readonly dataSource: MarketDataSource,
  ) {}

  listAssets(): Promise<Asset[]> {
    return this.notImplemented();
  }

  getAsset(_symbol: string): Promise<Asset | undefined> {
    return this.notImplemented();
  }

  getCurrentPrice(_symbol: string): Promise<AssetPrice | undefined> {
    return this.notImplemented();
  }

  getQuote(_symbol: string): Promise<MarketQuote> {
    return this.notImplemented();
  }

  getPriceHistory(_request: PriceHistoryRequest): Promise<AssetHistoryPoint[]> {
    return this.notImplemented();
  }

  getExpectedYield(_symbol: string): Promise<ExpectedYield | undefined> {
    return this.notImplemented();
  }

  getEducationalInfo(
    _symbol: string,
  ): Promise<EducationalAssetInfo | undefined> {
    return this.notImplemented();
  }

  refreshPrices(_request?: RefreshMarketPricesRequest): Promise<Asset[]> {
    return this.notImplemented();
  }

  async getProviderStatus(): Promise<MarketProviderStatus> {
    return {
      sessionStatus: MarketSessionStatus.PROVIDER_FAILURE,
      dataSource: this.dataSource,
      priceStatus: PriceStatus.UNAVAILABLE,
      checkedAt: new Date(),
      message: `${this.providerName} is a planned adapter and has no real integration yet.`,
    };
  }

  private notImplemented<T>(): Promise<T> {
    return Promise.reject(
      new Error(`${this.providerName} is planned but not implemented.`),
    );
  }
}

export class BrapiMarketDataProvider extends PlannedMarketDataProvider {
  constructor() {
    super("BrapiMarketDataProvider", MarketDataSource.BRAPI);
  }
}

export class B3MarketDataProvider extends PlannedMarketDataProvider {
  constructor() {
    super("B3MarketDataProvider", MarketDataSource.B3);
  }
}

export class GoogleFinanceMarketDataProvider extends PlannedMarketDataProvider {
  constructor() {
    super("GoogleFinanceMarketDataProvider", MarketDataSource.GOOGLE_FINANCE);
  }
}

export class MsnMoneyMarketDataProvider extends PlannedMarketDataProvider {
  constructor() {
    super("MsnMoneyMarketDataProvider", MarketDataSource.MSN_MONEY);
  }
}

export class CachedMarketDataProvider extends PlannedMarketDataProvider {
  constructor() {
    super("CachedMarketDataProvider", MarketDataSource.CACHE);
  }
}

export class FallbackMarketDataProvider extends PlannedMarketDataProvider {
  constructor() {
    super("FallbackMarketDataProvider", MarketDataSource.FALLBACK);
  }
}

export class CompositeMarketDataProvider extends PlannedMarketDataProvider {
  constructor() {
    super("CompositeMarketDataProvider", MarketDataSource.FALLBACK);
  }
}
