import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";
import { ApiExceptionFilter } from "../src/infra/errors/api-exception.filter.js";

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

describe("Financial API E2E", () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.listen(0);
    const address = app.getHttpServer().address();
    const port =
      typeof address === "object" && address !== null ? address.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await app.close();
  });

  it("runs the main financial cycle via HTTP", async () => {
    const created = await readJson<{
      id: string;
      wallet: { amountCents: number; currency: string; formatted: string };
    }>(
      await fetch(`${baseUrl}/players`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Marcos", initialBalanceCents: 200_000 }),
      }),
    );
    expect(created.status).toBe(201);
    expect(created.body.wallet).toMatchObject({
      amountCents: 200_000,
      currency: "FORTUNA",
    });

    const assets = await readJson<Array<{ id: string; symbol: string }>>(
      await fetch(`${baseUrl}/assets`),
    );
    expect(assets.status).toBe(200);
    const incomeAsset = assets.body.find((asset) => asset.symbol === "FIISF001");
    expect(incomeAsset).toBeDefined();

    const price = await readJson<{ priceCents: number; formatted: string }>(
      await fetch(`${baseUrl}/assets/${incomeAsset!.id}/price`),
    );
    expect(price.status).toBe(200);
    expect(Number.isInteger(price.body.priceCents)).toBe(true);
    expect(price.body.formatted).toContain("F$");

    const buy = await readJson<{
      orderId: string;
      type: string;
      quantity: string;
      totalCents: number;
      walletBalanceAfterCents: number;
    }>(
      await fetch(`${baseUrl}/players/${created.body.id}/orders/buy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId: incomeAsset!.id, quantity: "2" }),
      }),
    );
    expect(buy.status).toBe(200);
    expect(buy.body).toMatchObject({ type: "BUY", quantity: "2" });
    expect(buy.body.totalCents).toBe(price.body.priceCents * 2);

    const mentorAfterBuy = await readJson<{
      items: Array<{ id: string; trigger: string; title: string; readAt: string | null }>;
    }>(await fetch(`${baseUrl}/players/${created.body.id}/mentor/messages`));
    expect(mentorAfterBuy.status).toBe(200);
    expect(mentorAfterBuy.body.items.map((item) => item.trigger)).toContain(
      "first_purchase",
    );

    const wallet = await readJson<{ balanceCents: number; formatted: string }>(
      await fetch(`${baseUrl}/players/${created.body.id}/wallet`),
    );
    expect(wallet.status).toBe(200);
    expect(wallet.body.balanceCents).toBe(buy.body.walletBalanceAfterCents);
    expect(wallet.body.formatted).toContain("F$");

    const portfolio = await readJson<{
      positions: Array<{ assetId: string; quantity: string }>;
      totalMarketValueCents: number;
    }>(await fetch(`${baseUrl}/players/${created.body.id}/portfolio`));
    expect(portfolio.status).toBe(200);
    expect(portfolio.body.positions).toContainEqual(
      expect.objectContaining({ assetId: incomeAsset!.id, quantity: "2" }),
    );
    expect(portfolio.body.totalMarketValueCents).toBeGreaterThan(0);

    const allocation = await readJson<{
      byAssetType: Array<{ basisPoints: number }>;
      byAsset: Array<{ basisPoints: number }>;
    }>(
      await fetch(`${baseUrl}/players/${created.body.id}/portfolio/allocation`),
    );
    expect(allocation.status).toBe(200);
    expect(allocation.body.byAssetType[0]?.basisPoints).toBe(10_000);
    expect(allocation.body.byAsset[0]?.basisPoints).toBe(10_000);

    const income = await readJson<{
      collectedIncomeCents: number;
      walletBalanceAfterCents: number;
      events: Array<{ symbol: string; amountCents: number }>;
    }>(
      await fetch(`${baseUrl}/players/${created.body.id}/income/collect`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId: incomeAsset!.id }),
      }),
    );
    expect(income.status).toBe(200);
    expect(income.body.collectedIncomeCents).toBeGreaterThan(0);
    expect(income.body.events[0]).toMatchObject({ symbol: "FIISF001" });

    const duplicateIncome = await readJson<{ error: string }>(
      await fetch(`${baseUrl}/players/${created.body.id}/income/collect`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          incomeEventId: income.body.events[0]!.incomeEventId,
        }),
      }),
    );
    expect(duplicateIncome.status).toBe(422);
    expect(duplicateIncome.body.error).toBe("INCOME_ALREADY_COLLECTED");

    const refreshBeforeSell = await readJson<{
      updatedAssets: Array<{ assetId: string; currentPriceCents: number }>;
    }>(
      await fetch(`${baseUrl}/market/refresh-mock-prices`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ asOf: "2026-05-22T12:00:00.000Z" }),
      }),
    );
    expect(refreshBeforeSell.status).toBe(200);

    const sell = await readJson<{ type: string; quantity: string }>(
      await fetch(`${baseUrl}/players/${created.body.id}/orders/sell`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId: incomeAsset!.id, quantity: "1" }),
      }),
    );
    expect(sell.status).toBe(200);
    expect(sell.body).toMatchObject({ type: "SELL", quantity: "1" });

    const mentorLatest = await readJson<{
      message: { id: string; trigger: string; severity: string; readAt: string | null } | null;
    }>(await fetch(`${baseUrl}/players/${created.body.id}/mentor/latest`));
    expect(mentorLatest.status).toBe(200);
    expect(mentorLatest.body.message).not.toBeNull();
    const mentorAfterSell = await readJson<{
      items: Array<{ trigger: string }>;
    }>(await fetch(`${baseUrl}/players/${created.body.id}/mentor/messages`));
    expect(
      mentorAfterSell.body.items.some((item) =>
        ["sale_with_loss", "sale_with_gain"].includes(item.trigger),
      ),
    ).toBe(true);

    const markRead = await readJson<{ ok: true }>(
      await fetch(
        `${baseUrl}/players/${created.body.id}/mentor/messages/${mentorAfterBuy.body.items[0]!.id}/read`,
        { method: "POST" },
      ),
    );
    expect(markRead.status).toBe(200);
    expect(markRead.body.ok).toBe(true);

    const transactions = await readJson<{
      items: Array<{ type: string; totalCents: number }>;
      total: number;
    }>(await fetch(`${baseUrl}/players/${created.body.id}/transactions`));
    expect(transactions.status).toBe(200);
    expect(transactions.body.total).toBe(3);
    expect(transactions.body.items.map((item) => item.type)).toEqual([
      "BUY",
      "INCOME_COLLECTED",
      "SELL",
    ]);

    const refresh = await readJson<{
      updatedAssets: Array<{ assetId: string; currentPriceCents: number }>;
    }>(
      await fetch(`${baseUrl}/market/refresh-mock-prices`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(refresh.status).toBe(200);
    expect(refresh.body.updatedAssets.length).toBeGreaterThan(0);

    const history = await readJson<{ history: Array<{ priceCents: number }> }>(
      await fetch(`${baseUrl}/assets/${incomeAsset!.id}/history`),
    );
    expect(history.status).toBe(200);
    expect(history.body.history.length).toBeGreaterThan(0);
  });

  it("returns predictable financial errors", async () => {
    const missingPlayer = await readJson<{ error: string }>(
      await fetch(`${baseUrl}/players/missing-player`),
    );
    expect(missingPlayer.status).toBe(404);
    expect(missingPlayer.body.error).toBe("PLAYER_NOT_FOUND");

    const missingAsset = await readJson<{ error: string }>(
      await fetch(`${baseUrl}/assets/missing-asset`),
    );
    expect(missingAsset.status).toBe(404);
    expect(missingAsset.body.error).toBe("ASSET_NOT_FOUND");

    const created = await readJson<{ id: string }>(
      await fetch(`${baseUrl}/players`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Sem Saldo", initialBalanceCents: 100 }),
      }),
    );
    const assets = await readJson<Array<{ id: string; symbol: string }>>(
      await fetch(`${baseUrl}/assets`),
    );
    const asset = assets.body.find((item) => item.symbol === "FIISF001")!;

    const invalidQuantity = await readJson<{ error: string }>(
      await fetch(`${baseUrl}/players/${created.body.id}/orders/buy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId: asset.id, quantity: "0" }),
      }),
    );
    expect(invalidQuantity.status).toBe(400);
    expect(invalidQuantity.body.error).toBe("VALIDATION_ERROR");

    const insufficientFunds = await readJson<{
      error: string;
      details: { requiredCents: number; availableCents: number };
    }>(
      await fetch(`${baseUrl}/players/${created.body.id}/orders/buy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId: asset.id, quantity: "10" }),
      }),
    );
    expect(insufficientFunds.status).toBe(422);
    expect(insufficientFunds.body.error).toBe("INSUFFICIENT_FUNDS");
    expect(insufficientFunds.body.details.availableCents).toBe(100);

    const insufficientPosition = await readJson<{ error: string }>(
      await fetch(`${baseUrl}/players/${created.body.id}/orders/sell`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId: asset.id, quantity: "1" }),
      }),
    );
    expect(insufficientPosition.status).toBe(422);
    expect(insufficientPosition.body.error).toBe("INSUFFICIENT_POSITION");

    const noIncome = await readJson<{ error: string }>(
      await fetch(`${baseUrl}/players/${created.body.id}/income/collect`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId: "asset-atf001" }),
      }),
    );
    expect(noIncome.status).toBe(422);
    expect(noIncome.body.error).toBe("NO_INCOME_AVAILABLE");
  });
});
