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
  isMocked: boolean;
}

describe("Assets and Market API E2E", () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeEach(async () => {
    ({ app, baseUrl } = await createTestApp());
  });

  afterEach(async () => {
    await closeTestApp(app);
  });

  async function firstAsset() {
    const assets = await readJson<AssetResponse[]>(
      await fetch(`${baseUrl}/assets`),
    );
    return (
      assets.body.find((asset) => asset.symbol === "FIISF001") ??
      assets.body[0]!
    );
  }

  it("lists assets", async () => {
    const response = await readJson<AssetResponse[]>(
      await fetch(`${baseUrl}/assets`),
    );

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
    expect(
      response.body.every((asset) => Number.isInteger(asset.currentPriceCents)),
    ).toBe(true);
    expect(response.body.every((asset) => asset.isMocked)).toBe(true);
  });

  it("returns asset details by id", async () => {
    const asset = await firstAsset();
    const response = await readJson<{
      asset: AssetResponse;
      educationalInfo: { symbol: string };
    }>(await fetch(`${baseUrl}/assets/${asset.id}`));

    expect(response.status).toBe(200);
    expect(response.body.asset).toMatchObject({
      id: asset.id,
      symbol: asset.symbol,
    });
    expect(response.body.educationalInfo.symbol).toBe(asset.symbol);
  });

  it("returns a predictable error for a missing asset", async () => {
    const response = await readJson<ApiErrorBody>(
      await fetch(`${baseUrl}/assets/missing-asset`),
    );

    expectApiError(response, { status: 404, code: "ASSET_NOT_FOUND" });
  });

  it("returns the current asset price", async () => {
    const asset = await firstAsset();
    const response = await readJson<{
      assetId: string;
      symbol: string;
      priceCents: number;
    }>(await fetch(`${baseUrl}/assets/${asset.id}/price`));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      assetId: asset.id,
      symbol: asset.symbol,
    });
    expect(Number.isInteger(response.body.priceCents)).toBe(true);
  });

  it("returns asset price history", async () => {
    const asset = await firstAsset();
    const response = await readJson<{
      assetId: string;
      history: Array<{ priceCents: number }>;
    }>(await fetch(`${baseUrl}/assets/${asset.id}/history`));

    expect(response.status).toBe(200);
    expect(response.body.assetId).toBe(asset.id);
    expect(response.body.history.length).toBeGreaterThan(0);
    expect(
      response.body.history.every((point) =>
        Number.isInteger(point.priceCents),
      ),
    ).toBe(true);
  });

  it("refreshes mock prices with a fixed date", async () => {
    const response = await readJson<{
      updatedAssets: Array<{
        assetId: string;
        currentPriceCents: number;
        updatedAt: string;
      }>;
    }>(
      await fetch(`${baseUrl}/market/refresh-mock-prices`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ asOf: "2026-05-22T12:00:00.000Z" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.body.updatedAssets.length).toBeGreaterThan(0);
    expect(
      response.body.updatedAssets.every((asset) =>
        Number.isInteger(asset.currentPriceCents),
      ),
    ).toBe(true);
    expect(response.body.updatedAssets[0]!.updatedAt).toBe(
      "2026-05-22T12:00:00.000Z",
    );
  });
});
