import { describe, expect, it, vi } from "vitest";
import {
  MarketDataErrorCode,
  MarketDataProviderType,
  MarketDataSource,
  PriceStatus,
} from "@fortuna/application";
import {
  BrapiMarketDataProvider,
  createMarketDataProvider,
  readMarketDataConfig,
} from "../src/index.js";

const brapiPayload = {
  results: [
    {
      symbol: "PETR4",
      shortName: "PETROBRAS PN",
      currency: "BRL",
      regularMarketPrice: 38.42,
      regularMarketPreviousClose: 37.5,
      regularMarketChangePercent: 2.453,
      regularMarketTime: "2026-05-26T14:00:00.000Z",
      historicalDataPrice: [
        {
          date: 1_778_694_400,
          open: 37.5,
          high: 38.9,
          low: 37.25,
          close: 38.42,
          volume: 123456,
        },
      ],
    },
  ],
};

describe("BrapiMarketDataProvider", () => {
  it("builds the brapi quote URL with comma-separated tickers and history params", () => {
    const provider = new BrapiMarketDataProvider({
      baseUrl: "https://brapi.dev/api/",
    });

    const url = provider.buildQuoteUrl(["petr4", "vale3"], {
      range: "1mo",
      interval: "1d",
    });

    expect(url.toString()).toBe(
      "https://brapi.dev/api/quote/PETR4,VALE3?range=1mo&interval=1d",
    );
  });

  it("sends Authorization when BRAPI_API_TOKEN is configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(brapiPayload));
    const provider = new BrapiMarketDataProvider({
      token: "test-api-token",
      fetch: fetchMock,
    });

    await provider.getQuotes({ symbols: ["PETR4"] });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: { Authorization: "Bearer test-api-token" },
      }),
    );
  });

  it("allows unauthenticated calls only for controlled public test tickers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(brapiPayload));
    const provider = new BrapiMarketDataProvider({ fetch: fetchMock });

    await expect(
      provider.getQuotes({ symbols: ["PETR4"] }),
    ).resolves.toMatchObject({
      errors: [],
    });

    const blocked = await provider.getQuotes({ symbols: ["ABCD3"] });
    expect(blocked.errors[0]).toMatchObject({
      code: MarketDataErrorCode.MISSING_TOKEN,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps brapi quotes to Fortuna DTOs without leaking raw provider shape", async () => {
    const provider = new BrapiMarketDataProvider({
      fetch: vi.fn().mockResolvedValue(okResponse(brapiPayload)),
      clock: () => new Date("2026-05-26T15:00:00.000Z"),
    });

    const output = await provider.getQuotes({ symbols: ["PETR4"] });

    expect(output.quotes[0]).toMatchObject({
      symbol: "PETR4",
      priceCents: 3842,
      previousPriceCents: 3750,
      variationBps: 245,
      dataSource: MarketDataSource.BRAPI,
      priceStatus: PriceStatus.UPDATED,
      trace: {
        source: "brapi",
        isRealData: true,
        isCached: false,
        isFallback: false,
      },
    });
    expect(output.quotes[0]).not.toHaveProperty("regularMarketPrice");
  });

  it("applies allowlist normalization and does not call brapi for blocked tickers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(brapiPayload));
    const provider = new BrapiMarketDataProvider({
      token: "token",
      allowedSymbols: ["PETR4"],
      fetch: fetchMock,
    });

    await expect(
      provider.getQuotes({ symbols: ["petr4"] }),
    ).resolves.toMatchObject({
      errors: [],
    });

    const blocked = await provider.getQuotes({ symbols: ["VALE3"] });
    expect(blocked.errors[0]).toMatchObject({
      code: MarketDataErrorCode.SYMBOL_NOT_ALLOWED,
      symbol: "VALE3",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("blocks real queries when the allowlist is empty", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(brapiPayload));
    const provider = new BrapiMarketDataProvider({
      token: "token",
      allowedSymbols: [],
      fetch: fetchMock,
    });

    const output = await provider.getQuotes({ symbols: ["PETR4"] });

    expect(output.errors[0]?.code).toBe(MarketDataErrorCode.SYMBOL_NOT_ALLOWED);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deduplicates symbols before enforcing the request limit", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(brapiPayload));
    const provider = new BrapiMarketDataProvider({
      token: "token",
      maxSymbolsPerRequest: 1,
      allowedSymbols: ["PETR4"],
      fetch: fetchMock,
    });

    await provider.getQuotes({ symbols: ["petr4", " PETR4 "] });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/quote/PETR4");
  });

  it("rejects excessive symbol requests before calling brapi", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(brapiPayload));
    const provider = new BrapiMarketDataProvider({
      token: "token",
      maxSymbolsPerRequest: 1,
      allowedSymbols: ["PETR4", "VALE3"],
      fetch: fetchMock,
    });

    const output = await provider.getQuotes({ symbols: ["PETR4", "VALE3"] });

    expect(output.errors[0]?.code).toBe(MarketDataErrorCode.TOO_MANY_SYMBOLS);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists allowed real assets in controlled batches respecting the max request size", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(payloadForSymbol("PETR4")))
      .mockResolvedValueOnce(okResponse(payloadForSymbol("VALE3")));
    const provider = new BrapiMarketDataProvider({
      token: "token",
      maxSymbolsPerRequest: 1,
      allowedSymbols: ["PETR4", "VALE3"],
      fetch: fetchMock,
    });

    const assets = await provider.listAssets();

    expect(assets.map((asset) => asset.symbol)).toEqual(["PETR4", "VALE3"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/quote/PETR4");
    expect(String(fetchMock.mock.calls[1][0])).toContain("/quote/VALE3");
  });

  it("maps historical OHLCV data to integer cent prices", async () => {
    const provider = new BrapiMarketDataProvider({
      fetch: vi.fn().mockResolvedValue(okResponse(brapiPayload)),
    });

    const output = await provider.getHistoricalPrices({
      symbol: "PETR4",
      range: "1mo",
      interval: "1d",
    });

    expect(output.prices[0]).toMatchObject({
      symbol: "PETR4",
      openPriceCents: 3750,
      maxPriceCents: 3890,
      minPriceCents: 3725,
      closePriceCents: 3842,
      volume: 123456,
    });
  });

  it("returns standardized errors for HTTP failures, rate limits, timeout, empty response and missing assets", async () => {
    await expectError(
      okResponse({ results: [] }),
      MarketDataErrorCode.EMPTY_RESPONSE,
    );
    await expectError(
      { ok: false, status: 500, statusText: "Server Error", json: vi.fn() },
      MarketDataErrorCode.HTTP_ERROR,
    );
    await expectError(
      { ok: false, status: 401, statusText: "Unauthorized", json: vi.fn() },
      MarketDataErrorCode.HTTP_ERROR,
    );
    await expectError(
      { ok: false, status: 403, statusText: "Forbidden", json: vi.fn() },
      MarketDataErrorCode.HTTP_ERROR,
    );
    await expectError(
      {
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        json: vi.fn(),
      },
      MarketDataErrorCode.RATE_LIMITED,
    );

    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    await expectError(Promise.reject(abortError), MarketDataErrorCode.TIMEOUT);

    const provider = new BrapiMarketDataProvider({
      fetch: vi.fn().mockResolvedValue(okResponse(brapiPayload)),
    });
    const output = await provider.getQuotes({ symbols: ["PETR4", "VALE3"] });
    expect(output.errors[0]).toMatchObject({
      code: MarketDataErrorCode.ASSET_NOT_FOUND,
      symbol: "VALE3",
    });
  });

  it("selects brapi by environment and wraps it with fallback/cache metadata", async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    };
    const provider = createMarketDataProvider(
      readMarketDataConfig({
        MARKET_DATA_PROVIDER: "brapi",
        MARKET_DATA_ALLOW_REAL_DATA: "true",
        BRAPI_API_TOKEN: "token",
      }),
      logger,
    );

    expect(provider.getProviderType()).toBe(MarketDataProviderType.FALLBACK);
    expect(provider.getProviderName()).toContain("BrapiMarketDataProvider");
    expect(logger.info).toHaveBeenCalledWith(
      "Real market data provider selected",
      expect.objectContaining({ action: "MARKET_DATA_REAL_PROVIDER_SELECTED" }),
    );
  });
});

async function expectError(
  response: unknown,
  code: MarketDataErrorCode,
): Promise<void> {
  const provider = new BrapiMarketDataProvider({
    token: "token",
    timeoutMs: 1,
    fetch: vi.fn().mockReturnValue(response),
  });

  const output = await provider.getQuotes({ symbols: ["PETR4"] });
  expect(output.errors[0]?.code).toBe(code);
}

function okResponse(payload: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: vi.fn().mockResolvedValue(payload),
  };
}

function payloadForSymbol(symbol: string) {
  return {
    results: [
      {
        ...brapiPayload.results[0],
        symbol,
        shortName: symbol,
      },
    ],
  };
}
