import { describe, expect, it } from "vitest";
import {
  AssetClass,
  LiquidityLevel,
  MarketDataSource,
  MarketRiskLevel,
  MarketSessionStatus,
  PriceStatus,
  YieldPeriodicity,
  YieldType,
} from "@fortuna/application";
import { AssetSymbol, AssetType, RiskLevel } from "@fortuna/domain";
import {
  MockMarketDataProvider,
  toDomainAsset,
} from "../src/market-data/MockMarketDataProvider.js";

const fixedDate = new Date("2026-05-21T12:00:00.000Z");

function makeProvider(seed = "test-seed", date = fixedDate) {
  return new MockMarketDataProvider({
    seed,
    clock: () => date,
  });
}

describe("MockMarketDataProvider", () => {
  it("lists the MVP assets with integer cent prices", async () => {
    const provider = makeProvider();
    const assets = await provider.listAssets();

    expect(assets.map((asset) => asset.symbol)).toEqual([
      "CASH",
      "TSF001",
      "CDBLF001",
      "FIISF001",
      "FIILF001",
      "AEF001",
      "ATF001",
    ]);
    expect(assets).toHaveLength(7);
    expect(
      assets.every(
        (asset) =>
          Number.isSafeInteger(asset.currentPriceCents) &&
          asset.currentPriceCents > 0 &&
          Number.isSafeInteger(asset.previousPriceCents) &&
          Number.isSafeInteger(asset.variationBps),
      ),
    ).toBe(true);
  });

  it("finds an existing asset and returns undefined for unknown assets", async () => {
    const provider = makeProvider();

    await expect(provider.getAsset("tsf001")).resolves.toMatchObject({
      symbol: "TSF001",
      assetClass: AssetClass.FIXED_INCOME,
      riskLevel: MarketRiskLevel.LOW,
      liquidity: LiquidityLevel.DAILY,
      priceStatus: PriceStatus.SIMULATED,
      dataSource: MarketDataSource.MOCK,
      isMocked: true,
    });
    await expect(provider.getAsset("MISSING1")).resolves.toBeUndefined();
  });

  it("returns current prices in integer cents with traceable source metadata", async () => {
    const provider = makeProvider();
    const price = await provider.getCurrentPrice("FIISF001");

    expect(price).toMatchObject({
      assetId: "asset-fiisf001",
      symbol: "FIISF001",
      priceStatus: PriceStatus.SIMULATED,
      dataSource: MarketDataSource.MOCK,
    });
    expect(Number.isSafeInteger(price?.priceCents)).toBe(true);
    expect(price?.priceCents).toBeGreaterThan(0);
    expect(price?.marketTimestamp.toISOString()).toBe(fixedDate.toISOString());
  });

  it("keeps CASH stable at one cent and with no MVP yield", async () => {
    const provider = makeProvider();
    const cash = await provider.getAsset("CASH");
    const yieldInfo = await provider.getExpectedYield("CASH");
    const history = await provider.getPriceHistory({
      symbol: "CASH",
      from: new Date("2026-05-19T00:00:00.000Z"),
      to: new Date("2026-05-21T00:00:00.000Z"),
    });

    expect(cash?.currentPriceCents).toBe(1);
    expect(cash?.previousPriceCents).toBe(1);
    expect(yieldInfo).toMatchObject({
      yieldType: YieldType.NONE,
      periodicity: YieldPeriodicity.NONE,
      amountPerUnitCents: 0,
      rateBps: 0,
    });
    expect(history.every((point) => point.closePriceCents === 1)).toBe(true);
  });

  it("is deterministic for the same seed and date", async () => {
    const first = makeProvider("same-seed", fixedDate);
    const second = makeProvider("same-seed", fixedDate);

    await expect(first.getCurrentPrice("ATF001")).resolves.toEqual(
      await second.getCurrentPrice("ATF001"),
    );
    await expect(
      first.getPriceHistory({
        symbol: "AEF001",
        from: new Date("2026-05-18T00:00:00.000Z"),
        to: new Date("2026-05-21T00:00:00.000Z"),
      }),
    ).resolves.toEqual(
      await second.getPriceHistory({
        symbol: "AEF001",
        from: new Date("2026-05-18T00:00:00.000Z"),
        to: new Date("2026-05-21T00:00:00.000Z"),
      }),
    );
  });

  it("changes simulated prices across dates for variable assets", async () => {
    const provider = makeProvider("date-seed", fixedDate);
    const first = await provider.getCurrentPrice("ATF001");

    await provider.refreshPrices({
      asOf: new Date("2026-05-22T12:00:00.000Z"),
    });
    const second = await provider.getCurrentPrice("ATF001");

    expect(second?.priceCents).not.toBe(first?.priceCents);
  });

  it("never generates zero or negative prices in long histories", async () => {
    const provider = makeProvider();
    const history = await provider.getPriceHistory({
      symbol: "ATF001",
      from: new Date("2026-01-01T00:00:00.000Z"),
      to: new Date("2026-12-31T00:00:00.000Z"),
    });

    expect(history).not.toHaveLength(0);
    expect(
      history.every(
        (point) =>
          point.openPriceCents > 0 &&
          point.closePriceCents > 0 &&
          point.minPriceCents > 0 &&
          point.maxPriceCents > 0,
      ),
    ).toBe(true);
  });

  it("returns simulated history sorted by date", async () => {
    const provider = makeProvider();
    const history = await provider.getPriceHistory({
      symbol: "FIILF001",
      from: new Date("2026-05-18T00:00:00.000Z"),
      to: new Date("2026-05-21T00:00:00.000Z"),
    });

    expect(
      history.map((point) => point.date.toISOString().slice(0, 10)),
    ).toEqual(["2026-05-18", "2026-05-19", "2026-05-20", "2026-05-21"]);
  });

  it("represents expected yields for fixed income and FIIs without applying them", async () => {
    const provider = makeProvider();

    await expect(provider.getExpectedYield("TSF001")).resolves.toMatchObject({
      yieldType: YieldType.FIXED_RATE,
      periodicity: YieldPeriodicity.DAILY,
      rateBps: 8,
    });
    await expect(provider.getExpectedYield("FIISF001")).resolves.toMatchObject({
      yieldType: YieldType.DISTRIBUTION,
      periodicity: YieldPeriodicity.MONTHLY,
      amountPerUnitCents: 70,
    });
  });

  it("models stocks with higher volatility than fixed income", async () => {
    const provider = makeProvider();
    const fixedHistory = await provider.getPriceHistory({
      symbol: "TSF001",
      from: new Date("2026-05-01T00:00:00.000Z"),
      to: new Date("2026-05-21T00:00:00.000Z"),
    });
    const stockHistory = await provider.getPriceHistory({
      symbol: "ATF001",
      from: new Date("2026-05-01T00:00:00.000Z"),
      to: new Date("2026-05-21T00:00:00.000Z"),
    });

    const fixedMaxMove = Math.max(
      ...fixedHistory.map((point) =>
        Math.abs(point.closePriceCents - point.openPriceCents),
      ),
    );
    const stockMaxMove = Math.max(
      ...stockHistory.map((point) =>
        Math.abs(point.closePriceCents - point.openPriceCents),
      ),
    );

    expect(stockMaxMove).toBeGreaterThan(fixedMaxMove);
  });

  it("fills educational data, liquidity and risk", async () => {
    const provider = makeProvider();
    const info = await provider.getEducationalInfo("FIILF001");
    const asset = await provider.getAsset("FIILF001");

    expect(asset?.riskLevel).toBe(MarketRiskLevel.MEDIUM);
    expect(asset?.liquidity).toBe(LiquidityLevel.MEDIUM);
    expect(info?.shortDescription.length).toBeGreaterThan(0);
    expect(info?.longDescription.length).toBeGreaterThan(0);
    expect(info?.riskExplanation.length).toBeGreaterThan(0);
    expect(info?.liquidityExplanation.length).toBeGreaterThan(0);
    expect(info?.beginnerTip.length).toBeGreaterThan(0);
    expect(info?.mentorHint.length).toBeGreaterThan(0);
  });

  it("exposes planned provider status for fallback and real-provider migration", async () => {
    const provider = makeProvider();

    await expect(provider.getProviderStatus()).resolves.toMatchObject({
      sessionStatus: MarketSessionStatus.SIMULATED,
      dataSource: MarketDataSource.MOCK,
      priceStatus: PriceStatus.SIMULATED,
    });
  });

  it("adapts market assets to the financial domain without exposing mock details", async () => {
    const provider = makeProvider();
    const marketAsset = await provider.getAsset("AEF001");

    expect(marketAsset).toBeDefined();
    const domainAsset = toDomainAsset(marketAsset!);
    const domainPrice = await provider.getCurrentPrice(domainAsset);

    expect(domainAsset.symbol.equals(AssetSymbol.create("AEF001"))).toBe(true);
    expect(domainAsset.type).toBe(AssetType.STOCK);
    expect(domainAsset.riskLevel).toBe(RiskLevel.HIGH);
    expect(domainPrice.unitPrice.cents).toBeGreaterThan(0);
  });
});
