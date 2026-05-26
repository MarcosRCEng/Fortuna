import { describe, expect, it } from "vitest";
import {
  Asset,
  AssetSymbol,
  AssetType,
  InsufficientBalanceError,
  InsufficientPositionError,
  MarketPrice,
  Money,
  PlayerAccount,
  Quantity,
  RiskLevel,
  Wallet,
} from "../src/index.js";

function asset(id: string, symbol: string, type: AssetType): Asset {
  return new Asset(
    id,
    AssetSymbol.create(symbol),
    symbol,
    type,
    RiskLevel.MEDIUM,
  );
}

describe("Wallet and portfolio invariants", () => {
  it("credits and debits using integer cents only", () => {
    const account = new PlayerAccount("player-1", Money.fromCents(1_000));

    account.credit(Money.fromCents(250));
    account.debit(Money.fromCents(500));

    expect(account.availableBalance.cents).toBe(750);
  });

  it("blocks negative balances and buy attempts without enough cash", () => {
    const account = new PlayerAccount("player-1", Money.fromCents(100));

    expect(() => account.debit(Money.fromCents(101))).toThrow(
      InsufficientBalanceError,
    );
    expect(account.availableBalance.cents).toBe(100);
  });

  it("updates position quantity and weighted average price", () => {
    const stock = asset("asset-a", "ATF001", AssetType.STOCK);
    const wallet = new Wallet(
      "wallet-1",
      new PlayerAccount("player-1", Money.fromCents(10_000)),
    );

    wallet.buy(stock, Quantity.fromUnits(2), Money.fromCents(1_000));
    wallet.buy(stock, Quantity.fromUnits(2), Money.fromCents(2_000));

    const position = wallet.requirePosition("ATF001");
    expect(position.totalQuantity.units).toBe(4);
    expect(position.averagePriceCents.cents).toBe(1_500);
  });

  it("supports partial and total sells while blocking sales above the position", () => {
    const fii = asset("asset-fii", "FIISF001", AssetType.FII);
    const wallet = new Wallet(
      "wallet-1",
      new PlayerAccount("player-1", Money.fromCents(10_000)),
    );
    wallet.buy(fii, Quantity.fromUnits(3), Money.fromCents(1_000));

    wallet.sell(fii, Quantity.fromUnits(2));

    expect(wallet.requirePosition("FIISF001").totalQuantity.units).toBe(1);
    expect(() => wallet.sell(fii, Quantity.fromUnits(2))).toThrow(
      InsufficientPositionError,
    );
    wallet.sell(fii, Quantity.fromUnits(1));
    expect(wallet.getPosition("FIISF001")).toBeUndefined();
  });

  it("calculates market value and allocation by asset class", () => {
    const fixedIncome = asset("asset-fixed", "TSF001", AssetType.FIXED_INCOME);
    const stock = asset("asset-stock", "ATF001", AssetType.STOCK);
    const wallet = new Wallet(
      "wallet-1",
      new PlayerAccount("player-1", Money.fromCents(1_000)),
    );
    wallet.buy(fixedIncome, Quantity.fromUnits(2), Money.fromCents(1_000));
    wallet.buy(stock, Quantity.fromUnits(1), Money.fromCents(2_000));
    const prices = [
      new MarketPrice(fixedIncome, Money.fromCents(1_000), new Date()),
      new MarketPrice(stock, Money.fromCents(2_000), new Date()),
    ];

    expect(wallet.investedValue(prices).cents).toBe(4_000);
    expect(wallet.totalEquity(prices).cents).toBe(5_000);
    expect(wallet.allocationByAssetType(prices)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assetType: AssetType.FIXED_INCOME,
          percentageBasisPoints: 5_000,
        }),
        expect.objectContaining({
          assetType: AssetType.STOCK,
          percentageBasisPoints: 5_000,
        }),
      ]),
    );
  });
});
