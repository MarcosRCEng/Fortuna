import { describe, expect, it, vi } from "vitest";
import {
  mapBrapiSubTypeToMarketAssetType,
  marketAssetGroupForType,
  MarketValidationError,
  MvpMarketDataService,
  normalizeMarketSymbol,
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
      subType: "stock",
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
        assetType: "STOCK",
        currency: "BRL",
      },
      {
        symbol: "VALE3",
        name: "Vale ON",
        assetType: "STOCK",
        currency: "BRL",
      },
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
    ]);
  });

  it.each([
    ["stock", "STOCK"],
    ["unit", "UNIT"],
    ["fii", "FII"],
    ["etf", "ETF"],
    ["fi-infra", "FI_INFRA"],
    ["fi-agro", "FI_AGRO"],
    ["fip", "FIP"],
    ["fidc", "FIDC"],
    ["bdr", "BDR"],
  ] as const)("maps brapi subtype %s to %s", (subType, expected) => {
    expect(mapBrapiSubTypeToMarketAssetType(subType)).toBe(expected);
  });

  it("maps missing or unknown brapi subtype to UNKNOWN with a warning", () => {
    const logger = { warn: vi.fn() };

    expect(mapBrapiSubTypeToMarketAssetType(undefined, logger)).toBe("UNKNOWN");
    expect(mapBrapiSubTypeToMarketAssetType("surprise", logger)).toBe(
      "UNKNOWN",
    );
    expect(logger.warn).toHaveBeenCalledWith(
      "Unknown brapi asset subtype",
      expect.objectContaining({
        action: "market_data_unknown_brapi_subtype",
      }),
    );
  });

  it.each([
    ["STOCK", "EQUITIES"],
    ["UNIT", "EQUITIES"],
    ["BDR", "EQUITIES"],
    ["FII", "REAL_ESTATE_FUNDS"],
    ["ETF", "EXCHANGE_TRADED_FUNDS"],
    ["FI_INFRA", "OTHER_LISTED_FUNDS"],
    ["FI_AGRO", "OTHER_LISTED_FUNDS"],
    ["FIP", "OTHER_LISTED_FUNDS"],
    ["FIDC", "OTHER_LISTED_FUNDS"],
    ["TREASURY", "FIXED_INCOME"],
    ["UNKNOWN", "UNKNOWN"],
  ] as const)("groups market asset type %s as %s", (type, group) => {
    expect(marketAssetGroupForType(type)).toBe(group);
  });

  it("normalizes market symbols", () => {
    expect(normalizeMarketSymbol(" itub4 ")).toBe("ITUB4");
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
      assetType: "STOCK",
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

  it("returns a paginated mock catalog with canonical asset types", async () => {
    const service = new MvpMarketDataService({
      config: { ...baseConfig, provider: "mock", allowRealData: false },
      clock: () => new Date("2026-05-28T18:00:00.000Z"),
    });

    const page = await service.getCatalog({ page: 1, pageSize: 5 });

    expect(page).toMatchObject({
      page: 1,
      pageSize: 5,
      totalItems: 13,
      totalPages: 3,
      hasNextPage: true,
      source: "MOCK",
      delayed: false,
      fetchedAt: "2026-05-28T18:00:00.000Z",
    });
    expect(new Set(page.items.map((item) => item.type))).toEqual(
      new Set(["BDR", "FII", "FI_AGRO", "FIDC", "FI_INFRA"]),
    );
  });

  it("searches catalog by ticker and name", async () => {
    const service = new MvpMarketDataService({
      config: { ...baseConfig, provider: "mock", allowRealData: false },
    });

    const byTicker = await service.getCatalog({
      search: "itub4",
      page: 1,
      pageSize: 20,
    });
    const byName = await service.getCatalog({
      search: "logistica",
      page: 1,
      pageSize: 20,
    });

    expect(byTicker.items.map((item) => item.symbol)).toEqual(["ITUB4"]);
    expect(byName.items.map((item) => item.symbol)).toEqual(["HGLG11"]);
  });

  it("filters catalog by one type, multiple types and sector", async () => {
    const service = new MvpMarketDataService({
      config: { ...baseConfig, provider: "mock", allowRealData: false },
    });

    const fii = await service.getCatalog({
      assetTypes: ["FII"],
      page: 1,
      pageSize: 20,
    });
    const multiple = await service.getCatalog({
      assetTypes: ["STOCK", "FII"],
      page: 1,
      pageSize: 20,
    });
    const sector = await service.getCatalog({
      sectors: ["Financeiro"],
      page: 1,
      pageSize: 20,
    });

    expect(fii.items.map((item) => item.symbol)).toEqual(["HGLG11"]);
    expect(multiple.items.map((item) => item.type)).toEqual([
      "FII",
      "STOCK",
      "STOCK",
      "STOCK",
      "STOCK",
    ]);
    expect(sector.items.map((item) => item.symbol)).toEqual(["ITUB4"]);
  });

  it("sorts catalog ascending and descending", async () => {
    const service = new MvpMarketDataService({
      config: { ...baseConfig, provider: "mock", allowRealData: false },
    });

    const ascending = await service.getCatalog({
      sortBy: "price",
      sortOrder: "asc",
      page: 1,
      pageSize: 20,
    });
    const descending = await service.getCatalog({
      sortBy: "changePercent",
      sortOrder: "desc",
      page: 1,
      pageSize: 20,
    });

    expect(ascending.items[0]?.symbol).toBe("MGLU3");
    expect(ascending.items.at(-1)?.symbol).toBe("TS2029");
    expect(descending.items[0]?.symbol).toBe("AURA33");
  });

  it("returns valid empty catalog pages and validates pagination and sort", async () => {
    const service = new MvpMarketDataService({
      config: { ...baseConfig, provider: "mock", allowRealData: false },
    });

    await expect(
      service.getCatalog({ page: 99, pageSize: 20 }),
    ).resolves.toMatchObject({
      items: [],
      page: 99,
      totalItems: 13,
      totalPages: 1,
      hasNextPage: false,
    });
    await expect(service.getCatalog({ page: 0, pageSize: 20 })).rejects.toThrow(
      "page must be",
    );
    await expect(
      service.getCatalog({ page: 1, pageSize: 101 }),
    ).rejects.toThrow("pageSize must be");
    await expect(
      service.getCatalog({
        page: 1,
        pageSize: 20,
        assetTypes: ["UNKNOWN"],
      }),
    ).rejects.toThrow("Unknown market asset type");
    await expect(
      service.getCatalog({
        page: 1,
        pageSize: 20,
        sortBy: "ticker" as "name",
      }),
    ).rejects.toThrow("sortBy must be");
  });

  it("maps brapi catalog entries without price and caches catalog responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({
        results: [
          {
            stock: "HGLG11",
            name: "CSHG Logistica FII",
            subType: "fii",
            sector: "Logistica",
          },
        ],
      }),
    );
    const service = new MvpMarketDataService({
      config: baseConfig,
      fetch: fetchMock,
      clock: () => new Date("2026-05-28T18:01:00.000Z"),
    });

    const first = await service.getCatalog({ page: 1, pageSize: 20 });
    const second = await service.getCatalog({ page: 1, pageSize: 20 });

    expect(first.items[0]).toMatchObject({
      symbol: "HGLG11",
      type: "FII",
      group: "REAL_ESTATE_FUNDS",
      currency: "BRL",
    });
    expect(first.items[0]?.priceCents).toBeUndefined();
    expect(second.source).toBe("CACHE");
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
