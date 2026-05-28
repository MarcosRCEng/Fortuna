import { INestApplication } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeTestApp, createTestApp, readJson } from "./test-http.js";

interface AssetResponse {
  id: string;
  symbol: string;
  currentPriceCents: number;
}

interface PlayerResponse {
  id: string;
}

describe("Wallet, Portfolio and Allocation API E2E", () => {
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
          name: "Portfolio Player",
          initialBalanceCents: 200_000,
        }),
      }),
    );
    return response.body;
  }

  async function buyIncomeAsset(playerId: string) {
    const assets = await readJson<AssetResponse[]>(
      await fetch(`${baseUrl}/assets`),
    );
    const asset = assets.body.find((item) => item.symbol === "FIISF001")!;
    const order = await readJson<{ walletBalanceAfterCents: number }>(
      await fetch(`${baseUrl}/players/${playerId}/orders/buy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId: asset.id, quantity: "2" }),
      }),
    );
    expect(order.status).toBe(200);
    return { asset, order: order.body };
  }

  it("returns the wallet after player creation", async () => {
    const player = await createPlayer();
    const response = await readJson<{ playerId: string; balanceCents: number }>(
      await fetch(`${baseUrl}/players/${player.id}/wallet`),
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      playerId: player.id,
      balanceCents: 200_000,
    });
  });

  it("returns the wallet after a buy", async () => {
    const player = await createPlayer();
    const { order } = await buyIncomeAsset(player.id);

    const response = await readJson<{ balanceCents: number }>(
      await fetch(`${baseUrl}/players/${player.id}/wallet`),
    );

    expect(response.status).toBe(200);
    expect(response.body.balanceCents).toBe(order.walletBalanceAfterCents);
  });

  it("returns the portfolio after a buy", async () => {
    const player = await createPlayer();
    const { asset } = await buyIncomeAsset(player.id);

    const response = await readJson<{
      positions: Array<{
        assetId: string;
        quantity: string;
        marketValueCents: number;
      }>;
      totalMarketValueCents: number;
    }>(await fetch(`${baseUrl}/players/${player.id}/portfolio`));

    expect(response.status).toBe(200);
    expect(response.body.positions).toContainEqual(
      expect.objectContaining({ assetId: asset.id, quantity: "2" }),
    );
    expect(response.body.totalMarketValueCents).toBeGreaterThan(0);
    expect(Number.isInteger(response.body.positions[0]!.marketValueCents)).toBe(
      true,
    );
  });

  it("returns portfolio allocation", async () => {
    const player = await createPlayer();
    await buyIncomeAsset(player.id);

    const response = await readJson<{
      byAssetType: Array<{ basisPoints: number; valueCents: number }>;
      byAsset: Array<{ basisPoints: number; valueCents: number }>;
    }>(await fetch(`${baseUrl}/players/${player.id}/portfolio/allocation`));

    expect(response.status).toBe(200);
    expect(response.body.byAssetType[0]?.basisPoints).toBe(10_000);
    expect(response.body.byAsset[0]?.basisPoints).toBe(10_000);
    expect(Number.isInteger(response.body.byAsset[0]!.valueCents)).toBe(true);
  });

  it("returns the player summary", async () => {
    const player = await createPlayer();
    await buyIncomeAsset(player.id);

    const response = await readJson<{
      playerId: string;
      totalTransactions: number;
      walletBalance: { amountCents: number };
      totalEquity: { amountCents: number };
    }>(await fetch(`${baseUrl}/players/${player.id}/summary`));

    expect(response.status).toBe(200);
    expect(response.body.playerId).toBe(player.id);
    expect(response.body.totalTransactions).toBe(1);
    expect(Number.isInteger(response.body.walletBalance.amountCents)).toBe(
      true,
    );
    expect(Number.isInteger(response.body.totalEquity.amountCents)).toBe(true);
  });
});
