import { INestApplication } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ApiErrorBody,
  closeTestApp,
  createTestApp,
  expectApiError,
  readJson,
} from "./test-http.js";

interface PlayerResponse {
  id: string;
}

interface AssetResponse {
  id: string;
  symbol: string;
}

interface IncomeResponse {
  collectedIncomeCents: number;
  walletBalanceAfterCents: number;
  events: Array<{
    incomeEventId: string;
    assetId: string;
    symbol: string;
    amountCents: number;
  }>;
}

describe("Income and Transactions API E2E", () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeEach(async () => {
    ({ app, baseUrl } = await createTestApp());
  });

  afterEach(async () => {
    await closeTestApp(app);
  });

  async function createPlayer() {
    const response = await readJson<PlayerResponse>(
      await fetch(`${baseUrl}/players`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Income Player",
          initialBalanceCents: 200_000,
        }),
      }),
    );
    return response.body;
  }

  async function asset(symbol: string) {
    const assets = await readJson<AssetResponse[]>(
      await fetch(`${baseUrl}/assets`),
    );
    return assets.body.find((item) => item.symbol === symbol)!;
  }

  async function buy(playerId: string, assetId: string, quantity = "2") {
    const response = await readJson<unknown>(
      await fetch(`${baseUrl}/players/${playerId}/orders/buy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId, quantity }),
      }),
    );
    expect(response.status).toBe(200);
  }

  it("collects available income successfully", async () => {
    const player = await createPlayer();
    const incomeAsset = await asset("FIISF001");
    await buy(player.id, incomeAsset.id);

    const response = await readJson<IncomeResponse>(
      await fetch(`${baseUrl}/players/${player.id}/income/collect`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId: incomeAsset.id }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.body.collectedIncomeCents).toBeGreaterThan(0);
    expect(response.body.events[0]).toMatchObject({
      assetId: incomeAsset.id,
      symbol: "FIISF001",
    });
    expect(Number.isInteger(response.body.events[0]!.amountCents)).toBe(true);
  });

  it("rejects duplicate income collection", async () => {
    const player = await createPlayer();
    const incomeAsset = await asset("FIISF001");
    await buy(player.id, incomeAsset.id);

    const collected = await readJson<IncomeResponse>(
      await fetch(`${baseUrl}/players/${player.id}/income/collect`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId: incomeAsset.id }),
      }),
    );
    const duplicate = await readJson<ApiErrorBody>(
      await fetch(`${baseUrl}/players/${player.id}/income/collect`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          incomeEventId: collected.body.events[0]!.incomeEventId,
        }),
      }),
    );

    expectApiError(duplicate, {
      status: 422,
      code: "INCOME_ALREADY_COLLECTED",
    });
  });

  it("rejects collection when no income is available for the asset", async () => {
    const player = await createPlayer();
    const noIncomeAsset = await asset("ATF001");

    const response = await readJson<ApiErrorBody>(
      await fetch(`${baseUrl}/players/${player.id}/income/collect`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId: noIncomeAsset.id }),
      }),
    );

    expectApiError(response, { status: 422, code: "NO_INCOME_AVAILABLE" });
  });

  it("returns history after BUY, INCOME_COLLECTED and SELL", async () => {
    const player = await createPlayer();
    const incomeAsset = await asset("FIISF001");
    await buy(player.id, incomeAsset.id);
    await readJson<IncomeResponse>(
      await fetch(`${baseUrl}/players/${player.id}/income/collect`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId: incomeAsset.id }),
      }),
    );
    await readJson<unknown>(
      await fetch(`${baseUrl}/players/${player.id}/orders/sell`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId: incomeAsset.id, quantity: "1" }),
      }),
    );

    const response = await readJson<{
      items: Array<{ type: string; totalCents: number }>;
      total: number;
    }>(await fetch(`${baseUrl}/players/${player.id}/transactions`));

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(3);
    expect(response.body.items.map((item) => item.type)).toEqual([
      "BUY",
      "INCOME_COLLECTED",
      "SELL",
    ]);
    expect(
      response.body.items.every((item) => Number.isInteger(item.totalCents)),
    ).toBe(true);
  });
});
