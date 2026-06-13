import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";

interface HttpResponse<T> {
  status: number;
  body: T;
}

async function readJson<T>(response: Response): Promise<HttpResponse<T>> {
  const text = await response.text();
  return {
    status: response.status,
    body: JSON.parse(text) as T,
  };
}

describe("Market Data API", () => {
  let app: INestApplication;
  let baseUrl: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalFetch: typeof fetch;

  beforeEach(async () => {
    originalEnv = { ...process.env };
    originalFetch = globalThis.fetch;
    process.env.MARKET_DATA_PROVIDER = "brapi";
    process.env.MARKET_DATA_ALLOW_REAL_DATA = "false";
    process.env.BRAPI_MAX_SYMBOLS_PER_REQUEST = "2";
    process.env.BRAPI_CACHE_TTL_SECONDS = "900";
    process.env.MARKET_CATALOG_CACHE_TTL_SECONDS = "900";
    process.env.MARKET_CATALOG_MAX_PAGE_SIZE = "50";
    process.env.MARKET_CATALOG_PROVIDER_CONCURRENCY = "3";

    await startApp();
  });

  afterEach(async () => {
    await app.close();
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  });

  async function startApp(): Promise<void> {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(0);
    const address = app.getHttpServer().address();
    const port =
      typeof address === "object" && address !== null ? address.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
  }

  it("lists allowed market assets", async () => {
    const response = await readJson<{
      data: Array<{ symbol: string; assetType: string; currency: string }>;
    }>(await fetch(`${baseUrl}/market/assets`));

    expect(response.status).toBe(200);
    expect(response.body.data.map((asset) => asset.symbol)).toEqual([
      "PETR4",
      "VALE3",
      "ITUB4",
      "MGLU3",
    ]);
  });

  it("returns mock quotes by default for one or more symbols", async () => {
    const one = await readJson<{
      data: Array<{ symbol: string; provider: string; isRealData: boolean }>;
      meta: { cacheTtlSeconds: number; realDataEnabled: boolean };
    }>(await fetch(`${baseUrl}/market/quotes?symbols=PETR4`));
    const many = await readJson<{
      data: Array<{ symbol: string; provider: string; priceInCents: number }>;
    }>(await fetch(`${baseUrl}/market/quotes?symbols=PETR4,VALE3`));

    expect(one.status).toBe(200);
    expect(one.body.data[0]).toMatchObject({
      symbol: "PETR4",
      provider: "mock",
      isRealData: false,
    });
    expect(one.body.meta).toEqual({
      cacheTtlSeconds: 900,
      realDataEnabled: false,
    });
    expect(many.status).toBe(200);
    expect(many.body.data.map((quote) => quote.symbol)).toEqual([
      "PETR4",
      "VALE3",
    ]);
    expect(Number.isInteger(many.body.data[0]?.priceInCents)).toBe(true);
  });

  it("validates missing and non-allowlisted symbols", async () => {
    const missing = await readJson<{
      error: { code: string; message: string };
    }>(await fetch(`${baseUrl}/market/quotes`));
    const blocked = await readJson<{
      error: { code: string; message: string };
    }>(await fetch(`${baseUrl}/market/quotes?symbols=ABCD3`));

    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("VALIDATION_ERROR");
    expect(blocked.status).toBe(400);
    expect(blocked.body.error.message).toContain("not allowed");
  });

  it("returns mock historical prices for a supported range and interval", async () => {
    const response = await readJson<{
      data: Array<{ symbol: string; closeInCents: number; provider: string }>;
      meta: { symbol: string; range: string; interval: string };
    }>(
      await fetch(
        `${baseUrl}/market/assets/PETR4/history?range=1mo&interval=1d`,
      ),
    );

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(30);
    expect(response.body.data[0]).toMatchObject({
      symbol: "PETR4",
      provider: "mock",
    });
    expect(Number.isInteger(response.body.data[0]?.closeInCents)).toBe(true);
    expect(response.body.meta).toMatchObject({
      symbol: "PETR4",
      range: "1mo",
      interval: "1d",
    });
  });

  it("returns a paginated market catalog and searches by ticker", async () => {
    const response = await readJson<{
      items: Array<{
        symbol: string;
        type: string;
        group: string;
        priceCents?: number;
        currency: string;
      }>;
      page: number;
      pageSize: number;
      totalItems: number;
      source: string;
      delayed: boolean;
    }>(
      await fetch(`${baseUrl}/market/catalog?search=ITUB4&page=1&pageSize=20`),
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      page: 1,
      pageSize: 20,
      totalItems: 1,
      source: "MOCK",
      delayed: false,
    });
    expect(response.body.items).toEqual([
      expect.objectContaining({
        symbol: "ITUB4",
        type: "STOCK",
        group: "EQUITIES",
        currency: "BRL",
      }),
    ]);
    expect(Number.isInteger(response.body.items[0]?.priceCents)).toBe(true);
  });

  it("searches the market catalog by name", async () => {
    const response = await readJson<{
      items: Array<{ symbol: string; name: string }>;
    }>(await fetch(`${baseUrl}/market/catalog?search=logistica`));

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([
      expect.objectContaining({
        symbol: "HGLG11",
        name: "CSHG Logistica FII",
      }),
    ]);
  });

  it("filters the market catalog by one type, multiple types and sector", async () => {
    const oneType = await readJson<{ items: Array<{ type: string }> }>(
      await fetch(`${baseUrl}/market/catalog?types=FII`),
    );
    const multipleTypes = await readJson<{
      items: Array<{ symbol: string; type: string }>;
    }>(
      await fetch(
        `${baseUrl}/market/catalog?types=STOCK,FII&sortBy=changePercent&sortOrder=desc`,
      ),
    );
    const sector = await readJson<{ items: Array<{ symbol: string }> }>(
      await fetch(`${baseUrl}/market/catalog?sectors=Financeiro`),
    );

    expect(oneType.status).toBe(200);
    expect(oneType.body.items.map((item) => item.type)).toEqual(["FII"]);
    expect(multipleTypes.status).toBe(200);
    expect(multipleTypes.body.items.map((item) => item.type)).toEqual([
      "STOCK",
      "STOCK",
      "FII",
      "STOCK",
      "STOCK",
    ]);
    expect(sector.status).toBe(200);
    expect(sector.body.items.map((item) => item.symbol)).toEqual(["ITUB4"]);
  });

  it("sorts the market catalog ascending and descending", async () => {
    const ascending = await readJson<{ items: Array<{ symbol: string }> }>(
      await fetch(
        `${baseUrl}/market/catalog?sortBy=price&sortOrder=asc&pageSize=20`,
      ),
    );
    const descending = await readJson<{ items: Array<{ symbol: string }> }>(
      await fetch(
        `${baseUrl}/market/catalog?sortBy=changePercent&sortOrder=desc&pageSize=20`,
      ),
    );

    expect(ascending.status).toBe(200);
    expect(ascending.body.items[0]?.symbol).toBe("MGLU3");
    expect(ascending.body.items.at(-1)?.symbol).toBe("TS2029");
    expect(descending.status).toBe(200);
    expect(descending.body.items[0]?.symbol).toBe("AURA33");
  });

  it("returns valid empty market catalog pages", async () => {
    const response = await readJson<{
      items: unknown[];
      page: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
    }>(await fetch(`${baseUrl}/market/catalog?page=99&pageSize=20`));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      items: [],
      page: 99,
      totalItems: 13,
      totalPages: 1,
      hasNextPage: false,
    });
  });

  it("returns 400 for invalid market catalog parameters", async () => {
    const invalidType = await readJson<{
      error: { code: string; message: string };
    }>(await fetch(`${baseUrl}/market/catalog?types=UNKNOWN`));
    const invalidPage = await readJson<{
      error: { code: string; message: string };
    }>(await fetch(`${baseUrl}/market/catalog?page=0`));
    const invalidSort = await readJson<{
      error: { code: string; message: string };
    }>(await fetch(`${baseUrl}/market/catalog?sortBy=ticker`));

    expect(invalidType.status).toBe(400);
    expect(invalidType.body.error.code).toBe("VALIDATION_ERROR");
    expect(invalidPage.status).toBe(400);
    expect(invalidSort.status).toBe(400);
  });

  it("returns market status", async () => {
    const response = await readJson<{
      data: {
        provider: string;
        realDataEnabled: boolean;
        hasBrapiToken: boolean;
        cacheTtlSeconds: number;
        catalogCacheTtlSeconds: number;
        catalogMaxPageSize: number;
        catalogProviderConcurrency: number;
        allowedSymbols: string[];
        capabilities: {
          listedCatalog: boolean;
          basicQuotes: boolean;
          detailedFiiData: boolean;
          treasury: boolean;
          analystConsensus: false;
        };
        lastSuccessfulFetchAt: string | null;
        status: string;
      };
    }>(await fetch(`${baseUrl}/market/status`));

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      provider: "brapi",
      realDataEnabled: false,
      hasBrapiToken: false,
      cacheTtlSeconds: 900,
      catalogCacheTtlSeconds: 900,
      catalogMaxPageSize: 50,
      catalogProviderConcurrency: 3,
      allowedSymbols: ["PETR4", "VALE3", "ITUB4", "MGLU3"],
      capabilities: {
        listedCatalog: true,
        basicQuotes: true,
        detailedFiiData: false,
        treasury: false,
        analystConsensus: false,
      },
      lastSuccessfulFetchAt: null,
      status: "mock_only",
    });
  });

  it("returns /market/catalog from the simulated brapi adapter and status exposes free capabilities", async () => {
    await app.close();
    process.env.MARKET_DATA_ALLOW_REAL_DATA = "true";
    process.env.BRAPI_API_TOKEN = "test-token";
    globalThis.fetch = mockBrapiFetch(originalFetch, {
      results: [
        {
          stock: "XPTO3",
          name: "XPTO ON",
          subType: "stock",
          sector: "Tecnologia",
          close: 12.34,
          change: 1.2,
          volume: 12345,
          market_cap: 10_000_000,
        },
      ],
    });
    await startApp();

    const catalog = await readJson<{
      items: Array<{ symbol: string; priceCents: number }>;
      source: string;
    }>(await fetch(`${baseUrl}/market/catalog?search=XPTO&pageSize=10`));
    const status = await readJson<{
      data: {
        capabilities: {
          listedCatalog: boolean;
          basicQuotes: boolean;
          detailedFiiData: boolean;
          treasury: boolean;
          analystConsensus: false;
        };
      };
    }>(await fetch(`${baseUrl}/market/status`));

    expect(catalog.status).toBe(200);
    expect(catalog.body.source).toBe("BRAPI");
    expect(catalog.body.items).toEqual([
      expect.objectContaining({ symbol: "XPTO3", priceCents: 1234 }),
    ]);
    expect(status.body.data.capabilities).toEqual({
      listedCatalog: true,
      basicQuotes: true,
      detailedFiiData: false,
      treasury: false,
      analystConsensus: false,
    });
  });

  it("keeps /market/catalog functional when the simulated brapi adapter is unavailable", async () => {
    await app.close();
    process.env.MARKET_DATA_ALLOW_REAL_DATA = "true";
    process.env.BRAPI_API_TOKEN = "test-token";
    globalThis.fetch = mockBrapiFetch(originalFetch, undefined, 500);
    await startApp();

    const response = await readJson<{
      items: Array<{ symbol: string }>;
      source: string;
    }>(await fetch(`${baseUrl}/market/catalog?search=ITUB4&pageSize=10`));

    expect(response.status).toBe(200);
    expect(response.body.source).toBe("MOCK");
    expect(response.body.items).toEqual([
      expect.objectContaining({ symbol: "ITUB4" }),
    ]);
  });
});

function mockBrapiFetch(
  originalFetch: typeof fetch,
  payload: unknown,
  status = 200,
): typeof fetch {
  return ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith("https://brapi.dev/api/quote/list")) {
      return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        statusText: status === 200 ? "OK" : "Server Error",
        json: () => Promise.resolve(payload),
      } as Response);
    }
    return originalFetch(input, init);
  }) as typeof fetch;
}
