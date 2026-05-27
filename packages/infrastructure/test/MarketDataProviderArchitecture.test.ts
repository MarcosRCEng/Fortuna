import { describe, expect, it, vi } from "vitest";
import {
  MarketDataProviderType,
  MarketDataErrorCode,
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
    const mock = createMarketDataProvider(
      readMarketDataConfig({
        provider: "mock",
      }),
    );

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

  it("cache avoids repeated quote calls for the same normalized ticker inside TTL", async () => {
    let now = new Date("2026-05-26T12:00:00.000Z");
    const inner = new MockMarketDataProvider();
    const spy = vi.spyOn(inner, "getQuotes");
    const cached = new CachedMarketDataProvider(inner, {
      ttlSeconds: 900,
      clock: () => now,
    });

    await cached.getQuotes({ symbols: ["petr4"] });
    const second = await cached.getQuotes({ symbols: [" PETR4 "] });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(second.trace.source).toBe("cache");

    now = new Date("2026-05-26T12:16:00.000Z");
    await cached.getQuotes({ symbols: ["PETR4"] });
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

  it.each([
    MarketDataErrorCode.TIMEOUT,
    MarketDataErrorCode.HTTP_ERROR,
    MarketDataErrorCode.RATE_LIMITED,
    MarketDataErrorCode.INVALID_RESPONSE,
    MarketDataErrorCode.PROVIDER_UNAVAILABLE,
  ])("fallback uses mock quotes when primary returns %s", async (code) => {
    const provider = new FallbackMarketDataProvider(
      new ErrorOutputProvider(code),
      new MockMarketDataProvider(),
    );

    const output = await provider.getQuotes({ symbols: ["PETR4"] });

    expect(output.quotes[0]).toMatchObject({
      symbol: "PETR4",
      trace: expect.objectContaining({
        source: "fallback",
        isFallback: true,
      }),
    });
  });

  it("does not fallback for business policy errors", async () => {
    const provider = new FallbackMarketDataProvider(
      new ErrorOutputProvider(MarketDataErrorCode.SYMBOL_NOT_ALLOWED),
      new MockMarketDataProvider(),
    );

    const output = await provider.getQuotes({ symbols: ["ABCD3"] });

    expect(output.quotes).toEqual([]);
    expect(output.errors[0]?.code).toBe(MarketDataErrorCode.SYMBOL_NOT_ALLOWED);
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

class ErrorOutputProvider extends FailingProvider {
  constructor(private readonly code: MarketDataErrorCode) {
    super();
  }

  override getQuotes(input: GetQuotesInput): Promise<GetQuotesOutput> {
    return Promise.resolve({
      quotes: [],
      errors: [
        {
          code: this.code,
          message: `Simulated ${this.code}`,
          statusCode:
            this.code === MarketDataErrorCode.RATE_LIMITED
              ? 429
              : this.code === MarketDataErrorCode.HTTP_ERROR
                ? 500
                : undefined,
          providerName: this.getProviderName(),
        },
      ],
      trace: {
        source: "brapi",
        providerName: this.getProviderName(),
        isRealData: true,
        isCached: false,
        isFallback: false,
        fetchedAt: new Date(),
        disclaimer: "Uso educativo.",
      },
    });
  }
}
