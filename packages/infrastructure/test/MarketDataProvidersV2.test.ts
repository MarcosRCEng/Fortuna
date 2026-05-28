import { describe, expect, it, vi } from "vitest";
import type { MarketDataConfig } from "../src/index.js";
import {
  AuditedMarketDataProvider,
  BrapiMarketDataProvider,
  CachedMarketDataProvider,
  FallbackMarketDataProvider,
  InMemoryMarketDataCache,
  MarketValidationError,
  MockMarketDataProvider,
  createComposedMarketDataService,
} from "../src/market-data/MarketDataProviders.js";

const baseConfig: MarketDataConfig = {
  provider: "brapi",
  allowRealData: true,
  brapi: {
    baseUrl: "https://brapi.dev/api",
    apiToken: "token",
    timeoutMs: 50,
    cacheTtlSeconds: 900,
    maxSymbolsPerRequest: 2,
    allowedSymbols: ["PETR4", "VALE3", "ITUB4", "MGLU3"],
  },
};

const brapiPayload = {
  results: [
    {
      symbol: "PETR4",
      shortName: "PETROBRAS PN",
      currency: "BRL",
      regularMarketPrice: 38.42,
      regularMarketPreviousClose: 37.95,
      regularMarketChange: 0.47,
      regularMarketChangePercent: 1.25,
      regularMarketTime: "2026-05-28T18:00:00.000Z",
      historicalDataPrice: [
        {
          date: 1_778_694_400,
          open: 37,
          high: 38.5,
          low: 36.5,
          close: 38.2,
          volume: 12_345_600,
        },
      ],
    },
  ],
};

describe("MarketDataProvider v2 architecture", () => {
  it("mock provider respects the stable contract", async () => {
    const provider = new MockMarketDataProvider(
      () => new Date("2026-05-28T18:00:00.000Z"),
    );

    await expect(provider.getQuote(" petr4 ")).resolves.toMatchObject({
      symbol: "PETR4",
      provider: "mock",
      isRealData: false,
      isDelayed: false,
      priceInCents: expect.any(Number),
    });
    await expect(
      provider.getHistoricalPrices("PETR4", { range: "5d", interval: "1d" }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          symbol: "PETR4",
          closeInCents: expect.any(Number),
          provider: "mock",
          isRealData: false,
        }),
      ]),
    );
    await expect(provider.getProviderStatus()).resolves.toMatchObject({
      provider: "mock",
      isAvailable: true,
      isRealDataEnabled: false,
    });
  });

  it("brapi provider maps quotes and history to internal cents without leaking token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(brapiPayload));
    const provider = new BrapiMarketDataProvider(
      baseConfig,
      undefined,
      fetchMock,
      () => new Date("2026-05-28T18:01:00.000Z"),
    );

    const quote = await provider.getQuote("PETR4");
    const history = await provider.getHistoricalPrices("PETR4", {
      range: "1mo",
      interval: "1d",
    });

    expect(quote).toMatchObject({
      symbol: "PETR4",
      priceInCents: 3842,
      regularMarketChangeInCents: 47,
      provider: "brapi",
      isRealData: true,
      isDelayed: true,
    });
    expect(history[0]).toMatchObject({
      openInCents: 3700,
      closeInCents: 3820,
      provider: "brapi",
      isRealData: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: { Authorization: "Bearer token" },
      }),
    );
    expect(JSON.stringify(await provider.getProviderStatus())).not.toContain(
      "token",
    );
  });

  it("cache normalizes symbols and returns provider cache while preserving real-data flag", async () => {
    const inner = {
      getQuote: vi.fn(),
      getQuotes: vi.fn().mockResolvedValue([
        {
          symbol: "PETR4",
          name: "Petrobras PN",
          assetType: "stock",
          currency: "BRL",
          priceInCents: 3842,
          regularMarketChangePercent: 0,
          marketTime: "2026-05-28T18:00:00.000Z",
          provider: "brapi",
          isRealData: true,
          isDelayed: true,
        },
        {
          symbol: "VALE3",
          name: "Vale ON",
          assetType: "stock",
          currency: "BRL",
          priceInCents: 6210,
          regularMarketChangePercent: 0,
          marketTime: "2026-05-28T18:00:00.000Z",
          provider: "brapi",
          isRealData: true,
          isDelayed: true,
        },
      ]),
      getHistoricalPrices: vi.fn(),
      getProviderStatus: vi.fn().mockResolvedValue({
        provider: "brapi",
        isAvailable: true,
        isRealDataEnabled: true,
        isUsingFallback: false,
        cacheEnabled: false,
      }),
    };
    const cached = new CachedMarketDataProvider(
      inner,
      new InMemoryMarketDataCache(),
      900,
    );

    await cached.getQuotes(["vale3", "PETR4", "PETR4"]);
    const second = await cached.getQuotes([" PETR4 ", "VALE3"]);

    expect(inner.getQuotes).toHaveBeenCalledTimes(1);
    expect(second).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: "cache", isRealData: true }),
      ]),
    );
  });

  it("fallback uses mock on provider errors and status records the reason", async () => {
    const primary = {
      getQuote: vi.fn().mockRejectedValue(new Error("HTTP 429")),
      getQuotes: vi.fn().mockRejectedValue(new Error("HTTP 429")),
      getHistoricalPrices: vi.fn().mockRejectedValue(new Error("HTTP 429")),
      getProviderStatus: vi.fn().mockResolvedValue({
        provider: "brapi",
        isAvailable: false,
        isRealDataEnabled: true,
        isUsingFallback: false,
        cacheEnabled: true,
      }),
    };
    const provider = new FallbackMarketDataProvider(
      primary,
      new MockMarketDataProvider(),
    );

    await expect(provider.getQuote("PETR4")).resolves.toMatchObject({
      provider: "mock",
      isRealData: false,
    });
    await expect(provider.getProviderStatus()).resolves.toMatchObject({
      isUsingFallback: true,
      lastFailureReason: "HTTP 429",
    });
  });

  it("audits success and failure without sensitive headers or payloads", async () => {
    const logger = { info: vi.fn(), warn: vi.fn() };
    const provider = new AuditedMarketDataProvider(
      new MockMarketDataProvider(),
      logger,
    );

    await provider.getQuotes(["PETR4"]);

    expect(logger.info).toHaveBeenCalledWith(
      "Market data audit event",
      expect.objectContaining({
        action: "MarketQuotesRequested",
      }),
    );
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain("Bearer");
  });

  it("market data service validates allowlist and uses only the composed contract", async () => {
    const service = createComposedMarketDataService({
      config: { ...baseConfig, provider: "mock", allowRealData: false },
    });

    await expect(service.getQuotes([""])).rejects.toBeInstanceOf(
      MarketValidationError,
    );
    await expect(service.getQuote("ABCD3")).rejects.toThrow("not allowed");
    await expect(service.getQuote("PETR4")).resolves.toMatchObject({
      provider: "mock",
    });
  });
});

function okResponse(payload: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: vi.fn().mockResolvedValue(payload),
  };
}
