import { describe, expect, it, vi } from "vitest";
import {
  MarketDataProviderType,
  type Asset,
  type AssetHistoryPoint,
  type AssetPrice,
  type EducationalAssetInfo,
  type ExpectedYield,
  type GetHistoricalPricesInput,
  type GetHistoricalPricesOutput,
  type GetQuotesInput,
  type GetQuotesOutput,
  type MarketDataProvider,
  MarketDataSource,
  MarketSessionStatus,
  type MarketQuote,
  PriceStatus,
  type PriceHistoryOptions,
  type PriceHistoryRequest,
} from "@fortuna/application";
import {
  CachedMarketDataProvider,
  createMarketDataProvider,
  FallbackMarketDataProvider,
  MockMarketDataProvider,
  readMarketDataConfig,
} from "../src/index.js";

describe("MarketDataProvider architecture", () => {
  it("mock provider returns expected assets and provider metadata", async () => {
    const provider = new MockMarketDataProvider();

    await expect(provider.listAssets()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          symbol: "TSF001",
          currentPriceCents: expect.any(Number),
          isMocked: true,
        }),
      ]),
    );
    expect(provider.getProviderName()).toBe("MockMarketDataProvider");
    expect(provider.getProviderType()).toBe(MarketDataProviderType.MOCK);
  });

  it("selects mock provider by configuration", () => {
    const mock = createMarketDataProvider(readMarketDataConfig({
      provider: "mock",
    }));

    expect(mock.getProviderType()).toBe(MarketDataProviderType.MOCK);
  });

  it("cache avoids repeated calls inside TTL", async () => {
    let now = new Date("2026-05-26T12:00:00.000Z");
    const inner = new MockMarketDataProvider();
    const spy = vi.spyOn(inner, "getAsset");
    const cached = new CachedMarketDataProvider(inner, {
      ttlSeconds: 60,
      clock: () => now,
    });

    await cached.getAsset("TSF001");
    await cached.getAsset("TSF001");
    expect(spy).toHaveBeenCalledTimes(1);

    now = new Date("2026-05-26T12:02:00.000Z");
    await cached.getAsset("TSF001");
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("fallback uses secondary provider when primary fails", async () => {
    const logger = { warn: vi.fn() };
    const provider = new FallbackMarketDataProvider(
      new FailingProvider(),
      new MockMarketDataProvider(),
      logger,
    );

    const asset = await provider.getAsset("TSF001");

    expect(asset?.symbol).toBe("TSF001");
    expect(logger.warn).toHaveBeenCalledWith(
      "Market data provider fallback used",
      expect.objectContaining({
        action: "market_provider_fallback_used",
      }),
    );
  });
});

class FailingProvider implements MarketDataProvider {
  getProviderName(): string {
    return "FailingProvider";
  }

  getProviderType(): MarketDataProviderType {
    return MarketDataProviderType.EXTERNAL;
  }

  getQuotes(_input: GetQuotesInput): Promise<GetQuotesOutput> {
    return this.fail();
  }

  getHistoricalPrices(
    _input: GetHistoricalPricesInput,
  ): Promise<GetHistoricalPricesOutput> {
    return this.fail();
  }

  listAssets(): Promise<Asset[]> {
    return this.fail();
  }

  getAssetById(): Promise<Asset | null> {
    return this.fail();
  }

  getAsset(): Promise<Asset | undefined> {
    return this.fail();
  }

  getCurrentPrice(): Promise<AssetPrice | undefined> {
    return this.fail();
  }

  getQuote(): Promise<MarketQuote> {
    return this.fail();
  }

  getPriceHistory(
    _requestOrAssetId: PriceHistoryRequest | string,
    _options?: PriceHistoryOptions,
  ): Promise<AssetHistoryPoint[]> {
    return this.fail();
  }

  getYieldInfo(): Promise<ExpectedYield | null> {
    return this.fail();
  }

  getExpectedYield(): Promise<ExpectedYield | undefined> {
    return this.fail();
  }

  getEducationalInfo(): Promise<EducationalAssetInfo | undefined> {
    return this.fail();
  }

  refreshPrices(): Promise<Asset[]> {
    return this.fail();
  }

  async getProviderStatus() {
    return {
      sessionStatus: MarketSessionStatus.PROVIDER_FAILURE,
      dataSource: MarketDataSource.EXTERNAL,
      priceStatus: PriceStatus.UNAVAILABLE,
      checkedAt: new Date(),
    };
  }

  private fail<T>(): Promise<T> {
    return Promise.reject(new Error("provider unavailable"));
  }
}
