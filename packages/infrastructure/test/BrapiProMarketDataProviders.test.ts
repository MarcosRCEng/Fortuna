import { describe, expect, it, vi } from "vitest";
import type { MarketDataConfig } from "../src/index.js";
import {
  BrapiFiiDetailsProvider,
  BrapiTreasuryMarketProvider,
  DisabledFiiDetailsProvider,
  DisabledTreasuryMarketProvider,
  MarketProProviderConfigurationError,
  MarketProProviderRequestError,
  createFiiDetailsProvider,
  createTreasuryMarketProvider,
  normalizeTreasurySlug,
} from "../src/index.js";

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
  catalog: {
    cacheTtlSeconds: 900,
    maxPageSize: 50,
    providerConcurrency: 3,
  },
  capabilities: {
    listedCatalog: true,
    basicQuotes: true,
    detailedFiiData: false,
    treasury: false,
    analystConsensus: false,
  },
};

describe("Brapi Pro market data providers", () => {
  it("keeps Pro adapters disabled by default and does not call HTTP", async () => {
    const fetchMock = vi.fn();
    const fiiProvider = createFiiDetailsProvider(
      baseConfig,
      undefined,
      fetchMock,
    );
    const treasuryProvider = createTreasuryMarketProvider(
      baseConfig,
      undefined,
      fetchMock,
    );

    expect(fiiProvider).toBeInstanceOf(DisabledFiiDetailsProvider);
    expect(treasuryProvider).toBeInstanceOf(DisabledTreasuryMarketProvider);
    await expect(fiiProvider.getFiiDetails("HGLG11")).rejects.toMatchObject({
      code: "NOT_AVAILABLE_IN_CURRENT_PLAN",
    });
    await expect(
      treasuryProvider.listTreasuryBonds({ page: 1, pageSize: 20 }),
    ).rejects.toMatchObject({
      code: "NOT_AVAILABLE_IN_CURRENT_PLAN",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("selects brapi Pro adapters only when capabilities are enabled", () => {
    const enabled = enableProCapabilities(baseConfig);

    expect(createFiiDetailsProvider(enabled)).toBeInstanceOf(
      BrapiFiiDetailsProvider,
    );
    expect(createTreasuryMarketProvider(enabled)).toBeInstanceOf(
      BrapiTreasuryMarketProvider,
    );
  });

  it("fails clearly when a selected Pro provider has no token", () => {
    const enabledWithoutToken = {
      ...enableProCapabilities(baseConfig),
      brapi: { ...baseConfig.brapi, apiToken: undefined },
    };

    expect(() => createFiiDetailsProvider(enabledWithoutToken)).toThrow(
      MarketProProviderConfigurationError,
    );
    expect(() => createTreasuryMarketProvider(enabledWithoutToken)).toThrow(
      MarketProProviderConfigurationError,
    );
  });

  it("maps FII Pro fields without inventing unavailable indicators", async () => {
    const provider = new BrapiFiiDetailsProvider(
      enableProCapabilities(baseConfig),
      undefined,
      vi.fn().mockResolvedValue(
        okResponse({
          data: {
            symbol: "HGLG11",
            pvp: 1.04,
            dividendYield12Months: 8.2,
            equity: 5_200_000_000,
            vacancy: 7.25,
            segment: "Logistica",
            managementType: "Ativa",
            mandate: "Tijolo",
            shareholders: 320000,
            referenceDate: "2026-06-12",
            delayMinutes: 15,
            isDelayed: true,
          },
        }),
      ),
    );

    await expect(provider.getFiiDetails("HGLG11")).resolves.toMatchObject({
      symbol: "HGLG11",
      priceToBookBps: 104,
      dividendYield12MonthsBps: 820,
      equityValueCents: 520_000_000_000,
      vacancyBps: 725,
      segment: "Logistica",
      managementType: "ACTIVE",
      mandate: "BRICK",
      shareholderCount: 320000,
      referenceDate: "2026-06-12",
      source: "BRAPI",
      delayMinutes: 15,
      dataState: "DELAYED",
    });
  });

  it("maps FII dividends to integer cents", async () => {
    const provider = new BrapiFiiDetailsProvider(
      enableProCapabilities(baseConfig),
      undefined,
      vi.fn().mockResolvedValue(
        okResponse({
          dividends: [
            {
              ticker: "HGLG11",
              value: 1.1,
              paymentDate: "2026-06-14",
              baseDate: "2026-05-31",
            },
          ],
        }),
      ),
    );

    await expect(provider.getFiiDividends("HGLG11")).resolves.toEqual([
      expect.objectContaining({
        symbol: "HGLG11",
        amountCents: 110,
        paymentDate: "2026-06-14",
        baseDate: "2026-05-31",
      }),
    ]);
  });

  it("maps Treasury fields with slug symbols, cents and separate rate bps", async () => {
    const provider = new BrapiTreasuryMarketProvider(
      enableProCapabilities(baseConfig),
      undefined,
      vi.fn().mockResolvedValue(
        okResponse({
          results: [
            {
              name: "Tesouro Selic 2029",
              type: "SELIC",
              indexer: "SELIC",
              couponType: "none",
              maturityDate: "2029-03-01",
              buyRate: 10.25,
              sellRate: 10.12,
              rateInterpretation: "annual",
              buyPrice: 1532.54,
              sellPrice: 1531.2,
              basePrice: 1532,
              durationDays: 998,
              referenceDate: "2026-06-12",
            },
          ],
          total: 1,
        }),
      ),
    );

    await expect(
      provider.listTreasuryBonds({ search: "selic", page: 1, pageSize: 20 }),
    ).resolves.toMatchObject({
      items: [
        {
          symbol: "tesouro-selic-2029",
          bondType: "SELIC",
          indexer: "SELIC",
          couponType: "NONE",
          buyRateBps: 1025,
          sellRateBps: 1012,
          buyPriceCents: 153254,
          sellPriceCents: 153120,
          basePriceCents: 153200,
          rateInterpretation: "ANNUAL_PERCENT",
        },
      ],
      source: "BRAPI",
      dataState: "REAL",
    });
  });

  it("normalizes treasury symbols as slugs instead of B3 tickers", () => {
    expect(normalizeTreasurySlug("Tesouro IPCA+ 2035")).toBe(
      "tesouro-ipca-2035",
    );
  });

  it("keeps partial treasury indicator responses usable", async () => {
    const provider = new BrapiTreasuryMarketProvider(
      enableProCapabilities(baseConfig),
      undefined,
      vi.fn().mockResolvedValue(
        okResponse({
          indicators: [
            {
              slug: "tesouro-ipca-2035",
              buyRate: 5.74,
              referenceDate: "2026-06-12",
            },
          ],
        }),
      ),
    );

    await expect(
      provider.getTreasuryIndicators(["tesouro-ipca-2035"]),
    ).resolves.toEqual([
      expect.objectContaining({
        symbol: "tesouro-ipca-2035",
        buyRateBps: 574,
        sellRateBps: undefined,
      }),
    ]);
  });

  it("maps 401 and 403 as Pro plan errors", async () => {
    const provider = new BrapiTreasuryMarketProvider(
      enableProCapabilities(baseConfig),
      undefined,
      vi.fn().mockResolvedValue(okResponse({}, 403)),
    );

    await expect(
      provider.getTreasuryIndicators(["tesouro-selic-2029"]),
    ).rejects.toMatchObject({
      code: "PLAN_FORBIDDEN",
      statusCode: 403,
    });
  });

  it("maps timeout failures explicitly", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    const provider = new BrapiFiiDetailsProvider(
      enableProCapabilities(baseConfig),
      undefined,
      vi.fn().mockRejectedValue(abortError),
    );

    await expect(provider.getFiiDetails("HGLG11")).rejects.toBeInstanceOf(
      MarketProProviderRequestError,
    );
    await expect(provider.getFiiDetails("HGLG11")).rejects.toMatchObject({
      code: "TIMEOUT",
    });
  });
});

function enableProCapabilities(config: MarketDataConfig): MarketDataConfig {
  return {
    ...config,
    capabilities: {
      ...config.capabilities,
      detailedFiiData: true,
      treasury: true,
    },
  };
}

function okResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Forbidden",
    json: vi.fn().mockResolvedValue(payload),
  };
}
