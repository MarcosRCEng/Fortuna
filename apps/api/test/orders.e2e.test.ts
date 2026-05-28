import { INestApplication } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ApiErrorBody,
  closeTestApp,
  createTestApp,
  expectApiError,
  readJson,
} from "./test-http.js";

interface AssetResponse {
  id: string;
  symbol: string;
  currentPriceCents: number;
}

interface PlayerResponse {
  id: string;
}

interface OrderResponse {
  type: string;
  playerId: string;
  assetId: string;
  symbol: string;
  quantity: string;
  totalCents: number;
  walletBalanceAfterCents: number;
}

describe("Orders API E2E", () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeEach(async () => {
    ({ app, baseUrl } = await createTestApp());
  });

  afterEach(async () => {
    await closeTestApp(app);
  });

  async function createPlayer(initialBalanceCents = 200_000) {
    const response = await readJson<PlayerResponse>(
      await fetch(`${baseUrl}/players`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Order Player", initialBalanceCents }),
      }),
    );
    expect(response.status).toBe(201);
    return response.body;
  }

  async function asset(symbol = "FIISF001") {
    const response = await readJson<AssetResponse[]>(
      await fetch(`${baseUrl}/assets`),
    );
    return response.body.find((item) => item.symbol === symbol)!;
  }

  async function buy(playerId: string, assetId: string, quantity: string) {
    return readJson<OrderResponse | ApiErrorBody>(
      await fetch(`${baseUrl}/players/${playerId}/orders/buy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId, quantity }),
      }),
    );
  }

  async function sell(playerId: string, assetId: string, quantity: string) {
    return readJson<OrderResponse | ApiErrorBody>(
      await fetch(`${baseUrl}/players/${playerId}/orders/sell`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId, quantity }),
      }),
    );
  }

  it("buys an asset successfully", async () => {
    const player = await createPlayer();
    const incomeAsset = await asset();
    const response = await buy(player.id, incomeAsset.id, "2");

    expect(response.status).toBe(200);
    const body = response.body as OrderResponse;
    expect(body).toMatchObject({
      type: "BUY",
      playerId: player.id,
      assetId: incomeAsset.id,
      quantity: "2",
    });
    expect(body.totalCents).toBe(incomeAsset.currentPriceCents * 2);
    expect(Number.isInteger(body.walletBalanceAfterCents)).toBe(true);
  });

  it("sells an asset successfully", async () => {
    const player = await createPlayer();
    const incomeAsset = await asset();
    await buy(player.id, incomeAsset.id, "2");

    const response = await sell(player.id, incomeAsset.id, "1");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      type: "SELL",
      playerId: player.id,
      assetId: incomeAsset.id,
      quantity: "1",
    });
  });

  it("rejects a buy for a missing player wallet", async () => {
    const incomeAsset = await asset();
    const response = await buy("missing-player", incomeAsset.id, "1");

    expectApiError(
      response as { status: number; headers: Headers; body: ApiErrorBody },
      {
        status: 404,
        code: "WALLET_NOT_FOUND",
      },
    );
  });

  it("rejects a buy for a missing asset", async () => {
    const player = await createPlayer();
    const response = await buy(player.id, "missing-asset", "1");

    expectApiError(
      response as { status: number; headers: Headers; body: ApiErrorBody },
      {
        status: 404,
        code: "ASSET_NOT_FOUND",
      },
    );
  });

  it("rejects an invalid buy quantity", async () => {
    const player = await createPlayer();
    const incomeAsset = await asset();
    const response = await buy(player.id, incomeAsset.id, "0");

    expectApiError(
      response as { status: number; headers: Headers; body: ApiErrorBody },
      {
        status: 400,
        code: "VALIDATION_ERROR",
      },
    );
  });

  it("rejects a buy with insufficient balance", async () => {
    const player = await createPlayer(100);
    const incomeAsset = await asset();
    const response = await buy(player.id, incomeAsset.id, "1");

    const error = expectApiError(
      response as { status: number; headers: Headers; body: ApiErrorBody },
      {
        status: 422,
        code: "INSUFFICIENT_BALANCE",
      },
    );
    expect(error.details?.availableCents).toBe(100);
  });

  it("rejects a sell with insufficient position", async () => {
    const player = await createPlayer();
    const incomeAsset = await asset();
    const response = await sell(player.id, incomeAsset.id, "1");

    expectApiError(
      response as { status: number; headers: Headers; body: ApiErrorBody },
      {
        status: 422,
        code: "INSUFFICIENT_POSITION",
      },
    );
  });
});
