import { INestApplication } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AuthService } from "../src/modules/auth/auth.service.js";
import {
  ApiErrorBody,
  closeTestApp,
  createTestApp,
  expectApiError,
  readJson,
} from "./test-http.js";

interface EducationalTrendResponse {
  symbol: string;
  classification: string;
  score: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  factors: Array<{
    code: string;
    impact: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
    explanation: string;
  }>;
  warnings: string[];
  dataAsOf: string;
  methodologyVersion: string;
  disclaimer: string;
}

interface EducationalTrendListResponse {
  items: EducationalTrendResponse[];
}

describe("Educational Trends API E2E", () => {
  let app: INestApplication;
  let baseUrl: string;
  let firstCookie: string;
  let secondCookie: string;

  beforeEach(async () => {
    ({ app, baseUrl } = await createTestApp());
    firstCookie = await createCookie("trend-user-1", "trend1@example.com");
    secondCookie = await createCookie("trend-user-2", "trend2@example.com");
  });

  afterEach(async () => {
    await closeTestApp(app);
  });

  it("requires authentication", async () => {
    const response = await readJson<ApiErrorBody>(
      await fetch(`${baseUrl}/me/mentor/educational-trends/ITUB4`),
    );

    expectApiError(response, { status: 401, code: "HTTP_ERROR" });
  });

  it("returns methodology and disclaimer for one symbol", async () => {
    const response = await request<EducationalTrendResponse>(
      "/me/mentor/educational-trends/ITUB4",
      firstCookie,
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      symbol: "ITUB4",
      methodologyVersion: "educational-trend-v1",
    });
    expect(response.body.disclaimer).toContain("Conteudo educacional");
    expect(response.body.disclaimer).toContain("Nao e recomendacao financeira");
    expect(Number.isInteger(response.body.score)).toBe(true);
    expect(response.body.factors.length).toBeGreaterThan(0);
  });

  it("returns a limited batch of symbols", async () => {
    const response = await request<EducationalTrendListResponse>(
      "/me/mentor/educational-trends?symbols=ITUB4,HGLG11,BOVA11",
      firstCookie,
    );

    expect(response.status).toBe(200);
    expect(response.body.items.map((item) => item.symbol)).toEqual([
      "ITUB4",
      "HGLG11",
      "BOVA11",
    ]);
  });

  it("validates symbol format and batch limit", async () => {
    const invalid = await request<ApiErrorBody>(
      "/me/mentor/educational-trends/ITUB4!",
      firstCookie,
    );
    const tooMany = await request<ApiErrorBody>(
      "/me/mentor/educational-trends?symbols=ITUB4,HGLG11,BOVA11,PETR4,VALE3,MGLU3",
      firstCookie,
    );

    expectApiError(invalid, { status: 400, code: "VALIDATION_ERROR" });
    expectApiError(tooMany, { status: 400, code: "VALIDATION_ERROR" });
  });

  it("uses only the authenticated player's portfolio context", async () => {
    const asset = await readJson<Array<{ id: string; symbol: string }>>(
      await fetch(`${baseUrl}/assets`),
    );
    const fii = asset.body.find((item) => item.symbol === "FIISF001")!;
    const order = await request<{ symbol: string }>(
      "/me/orders/buy",
      firstCookie,
      {
        method: "POST",
        body: { assetId: fii.id, quantity: "1" },
      },
    );
    expect(order.status).toBe(200);

    const first = await request<EducationalTrendResponse>(
      "/me/mentor/educational-trends/FIISF001",
      firstCookie,
    );
    const second = await request<EducationalTrendResponse>(
      "/me/mentor/educational-trends/FIISF001",
      secondCookie,
    );

    const firstPresence = first.body.factors.find(
      (factor) => factor.code === "PORTFOLIO_PRESENCE",
    );
    const secondPresence = second.body.factors.find(
      (factor) => factor.code === "PORTFOLIO_PRESENCE",
    );

    expect(firstPresence?.explanation).toContain("ja faz parte");
    expect(secondPresence?.explanation).toContain("nao faz parte");
  });

  it("keeps unavailable history explicit instead of inventing a score", async () => {
    const response = await request<EducationalTrendResponse>(
      "/me/mentor/educational-trends/UNKNOWN1",
      firstCookie,
    );

    expect(response.status).toBe(200);
    expect(response.body.classification).toBe("DADOS_INSUFICIENTES");
    expect(response.body.confidence).toBe("LOW");
  });

  async function createCookie(subject: string, email: string): Promise<string> {
    const auth = app.get(AuthService);
    const user = await auth.validateGoogleUser({
      subject,
      email,
      emailVerified: true,
      name: "Trend User",
    });
    const session = await auth.createSession(user, { headers: {} });
    return auth.cookieHeader(session.token, session.expiresAt).split(";")[0]!;
  }

  async function request<T>(
    path: string,
    cookie: string,
    options: { method?: string; body?: Record<string, unknown> } = {},
  ) {
    return readJson<T>(
      await fetch(`${baseUrl}${path}`, {
        method: options.method ?? "GET",
        headers: {
          cookie,
          ...(options.body ? { "content-type": "application/json" } : {}),
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      }),
    );
  }
});
