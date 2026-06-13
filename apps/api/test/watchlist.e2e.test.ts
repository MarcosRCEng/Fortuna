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

interface WatchlistResponse {
  playerId: string;
  preferences: {
    visibleGroups: string[];
    portfolioOnly: boolean;
    sortBy: string;
    sortOrder: string;
    maxItemsPerGroup?: number;
  };
  items: Array<{
    symbol: string;
    position: number;
    quoteStatus: string;
  }>;
}

describe("Watchlist API E2E", () => {
  let app: INestApplication;
  let baseUrl: string;
  let cookie: string;

  beforeEach(async () => {
    ({ app, baseUrl } = await createTestApp());
    const auth = app.get(AuthService);
    const user = await auth.validateGoogleUser({
      subject: "watchlist-user",
      email: "watchlist@example.com",
      emailVerified: true,
      name: "Watchlist User",
    });
    const session = await auth.createSession(user, { headers: {} });
    cookie = auth.cookieHeader(session.token, session.expiresAt).split(";")[0]!;
  });

  afterEach(async () => {
    await closeTestApp(app);
  });

  it("requires authentication", async () => {
    const response = await readJson<ApiErrorBody>(
      await fetch(`${baseUrl}/me/watchlist`),
    );

    expectApiError(response, { status: 401, code: "HTTP_ERROR" });
  });

  it("runs the authenticated persistent watchlist flow", async () => {
    const firstAdd = await request<WatchlistResponse>("/me/watchlist/items", {
      method: "POST",
      body: { symbol: "ITUB4" },
    });
    const duplicateAdd = await request<WatchlistResponse>(
      "/me/watchlist/items",
      {
        method: "POST",
        body: { symbol: "itub4" },
      },
    );
    const secondAdd = await request<WatchlistResponse>("/me/watchlist/items", {
      method: "POST",
      body: { symbol: "FIISF001" },
    });
    const reordered = await request<WatchlistResponse>(
      "/me/watchlist/items/order",
      {
        method: "PUT",
        body: { symbols: ["FIISF001", "ITUB4"] },
      },
    );
    const preferences = await request<WatchlistResponse>(
      "/me/watchlist/preferences",
      {
        method: "PATCH",
        body: {
          visibleGroups: ["EQUITIES", "REAL_ESTATE_FUNDS"],
          portfolioOnly: false,
          sortBy: "position",
          sortOrder: "asc",
          maxItemsPerGroup: 20,
        },
      },
    );
    const fetched = await request<WatchlistResponse>("/me/watchlist");
    const nextSessionFetched =
      await request<WatchlistResponse>("/me/watchlist");
    const removed = await request<WatchlistResponse>(
      "/me/watchlist/items/ITUB4",
      { method: "DELETE" },
    );

    expect(firstAdd.status).toBe(200);
    expect(duplicateAdd.body.items).toHaveLength(1);
    expect(secondAdd.body.items.map((item) => item.symbol)).toEqual([
      "ITUB4",
      "FIISF001",
    ]);
    expect(reordered.body.items.map((item) => item.symbol)).toEqual([
      "FIISF001",
      "ITUB4",
    ]);
    expect(preferences.body.preferences).toMatchObject({
      maxItemsPerGroup: 20,
      visibleGroups: ["EQUITIES", "REAL_ESTATE_FUNDS"],
    });
    expect(fetched.body.items.length).toBe(2);
    expect(nextSessionFetched.body.items.map((item) => item.symbol)).toEqual(
      fetched.body.items.map((item) => item.symbol),
    );
    expect(removed.body.items.map((item) => item.symbol)).toEqual(["FIISF001"]);
  });

  it("allows favoriting assets that exist only in the broad market catalog", async () => {
    const response = await request<WatchlistResponse>("/me/watchlist/items", {
      method: "POST",
      body: { symbol: "HGLG11" },
    });

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([
      expect.objectContaining({
        symbol: "HGLG11",
        quoteStatus: expect.any(String),
      }),
    ]);
  });

  it("rejects invalid symbols", async () => {
    const response = await request<ApiErrorBody>("/me/watchlist/items", {
      method: "POST",
      body: { symbol: "ZZZZ3" },
    });

    expectApiError(response, { status: 404, code: "ASSET_NOT_FOUND" });
  });

  async function request<T>(
    path: string,
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
