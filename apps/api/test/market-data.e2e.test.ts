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

  beforeEach(async () => {
    originalEnv = { ...process.env };
    process.env.MARKET_DATA_PROVIDER = "brapi";
    process.env.MARKET_DATA_ALLOW_REAL_DATA = "false";
    process.env.BRAPI_MAX_SYMBOLS_PER_REQUEST = "2";
    process.env.BRAPI_CACHE_TTL_SECONDS = "900";

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(0);
    const address = app.getHttpServer().address();
    const port =
      typeof address === "object" && address !== null ? address.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await app.close();
    process.env = originalEnv;
  });

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

  it("returns market status", async () => {
    const response = await readJson<{
      data: {
        provider: string;
        realDataEnabled: boolean;
        hasBrapiToken: boolean;
        cacheTtlSeconds: number;
        allowedSymbols: string[];
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
      allowedSymbols: ["PETR4", "VALE3", "ITUB4", "MGLU3"],
      lastSuccessfulFetchAt: null,
      status: "mock_only",
    });
  });
});
