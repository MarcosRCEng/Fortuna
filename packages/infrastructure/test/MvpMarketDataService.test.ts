import { describe, expect, it, vi } from "vitest";
import {
  MarketValidationError,
  MvpMarketDataService,
  toCents,
} from "../src/index.js";
import type { MarketDataConfig } from "../src/index.js";

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

describe("MvpMarketDataService", () => {
  it("converts decimal prices to integer cents immediately", () => {
    expect(toCents(38.42)).toBe(3842);
    expect(toCents(0.015)).toBe(2);
  });

  it("returns the configured MVP allowlist without calling brapi", () => {
    const service = new MvpMarketDataService({ config: baseConfig });

    expect(service.listAssets()).toEqual([
      {
        symbol: "PETR4",
        name: "Petrobras PN",
        assetType: "stock",
        currency: "BRL",
      },
      {
        symbol: "VALE3",
        name: "Vale ON",
        assetType: "stock",
        currency: "BRL",
      },
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
    ]);
  });

  it("normalizes symbols, maps brapi quotes and uses cache on repeated calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(brapiPayload));
    const service = new MvpMarketDataService({
      config: baseConfig,
      fetch: fetchMock,
      clock: () => new Date("2026-05-28T18:01:00.000Z"),
    });

    const first = await service.getQuotes([" petr4 "]);
    const second = await service.getQuotes(["PETR4"]);

    expect(first[0]).toMatchObject({
      symbol: "PETR4",
      priceInCents: 3842,
      regularMarketChangePercent: 1.25,
      regularMarketChangeInCents: 47,
      regularMarketPreviousCloseInCents: 3795,
      marketTime: "2026-05-28T18:00:00.000Z",
      provider: "brapi",
      isRealData: true,
      isDelayed: true,
    });
    expect(second[0]).toMatchObject({
      symbol: "PETR4",
      provider: "cache",
      isRealData: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(service.getStatus().status).toBe("ok");
  });

  it("maps brapi historical prices and caches them", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(brapiPayload));
    const service = new MvpMarketDataService({
      config: baseConfig,
      fetch: fetchMock,
    });

    const first = await service.getHistoricalPrices({
      symbol: "PETR4",
      range: "1mo",
      interval: "1d",
    });
    const second = await service.getHistoricalPrices({
      symbol: "PETR4",
      range: "1mo",
      interval: "1d",
    });

    expect(first[0]).toMatchObject({
      symbol: "PETR4",
      date: "2026-05-13",
      openInCents: 3700,
      highInCents: 3850,
      lowInCents: 3650,
      closeInCents: 3820,
      volume: 12_345_600,
      provider: "brapi",
    });
    expect(second[0]?.provider).toBe("cache");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses mock and reports mock_only when real data is disabled or token is absent", async () => {
    const fetchMock = vi.fn();
    const service = new MvpMarketDataService({
      config: {
        ...baseConfig,
        allowRealData: false,
        brapi: { ...baseConfig.brapi, apiToken: undefined },
      },
      fetch: fetchMock,
    });

    const quotes = await service.getQuotes(["PETR4"]);

    expect(quotes[0]).toMatchObject({
      symbol: "PETR4",
      provider: "mock",
      isRealData: false,
      isDelayed: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(service.getStatus()).toMatchObject({
      realDataEnabled: false,
      hasToken: false,
      status: "mock_only",
    });
  });

  it.each([
    [401, "Unauthorized"],
    [403, "Forbidden"],
    [429, "Too Many Requests"],
    [500, "Server Error"],
  ])("falls back to mock on HTTP %s", async (status, statusText) => {
    const service = new MvpMarketDataService({
      config: baseConfig,
      fetch: vi.fn().mockResolvedValue({
        ok: false,
        status,
        statusText,
        json: vi.fn(),
      }),
    });

    const quotes = await service.getQuotes(["PETR4"]);

    expect(quotes[0]?.provider).toBe("mock");
    expect(service.getStatus().status).toBe("degraded");
  });

  it("falls back to mock on timeout and invalid brapi responses", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    const timeoutService = new MvpMarketDataService({
      config: baseConfig,
      fetch: vi.fn().mockRejectedValue(abortError),
    });
    await expect(timeoutService.getQuotes(["PETR4"])).resolves.toMatchObject([
      { provider: "mock" },
    ]);

    const invalidService = new MvpMarketDataService({
      config: baseConfig,
      fetch: vi.fn().mockResolvedValue(okResponse({ results: [] })),
    });
    await expect(invalidService.getQuotes(["PETR4"])).resolves.toMatchObject([
      { provider: "mock" },
    ]);
  });

  it("validates symbols, request size, range and interval", async () => {
    const service = new MvpMarketDataService({
      config: {
        ...baseConfig,
        brapi: { ...baseConfig.brapi, maxSymbolsPerRequest: 1 },
      },
    });

    await expect(service.getQuotes([""])).rejects.toBeInstanceOf(
      MarketValidationError,
    );
    await expect(service.getQuotes(["ABCD3"])).rejects.toThrow("not allowed");
    await expect(service.getQuotes(["PETR4", "VALE3"])).rejects.toThrow(
      "At most 1",
    );
    await expect(
      service.getHistoricalPrices({
        symbol: "PETR4",
        range: "5d" as "1mo",
        interval: "1d",
      }),
    ).rejects.toThrow("range must be");
    await expect(
      service.getHistoricalPrices({
        symbol: "PETR4",
        range: "1mo",
        interval: "1h" as "1d",
      }),
    ).rejects.toThrow("interval must be 1d");
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
