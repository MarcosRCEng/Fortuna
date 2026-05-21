import { PlayerAccount } from "../accounts/PlayerAccount.js";
import { Asset } from "../assets/Asset.js";
import { PositionNotFoundError } from "../errors/FinancialErrors.js";
import { MarketPrice } from "../market/MarketPrice.js";
import { MoneyCents } from "../money/Money.js";
import { AssetType } from "../value-objects/AssetType.js";
import { Quantity } from "../value-objects/Quantity.js";
import { Position } from "./Position.js";

export type WalletId = string;

export interface AllocationValue {
  assetType: AssetType;
  value: MoneyCents;
  percentageBasisPoints: number;
}

export class Wallet {
  private readonly positionsBySymbol = new Map<string, Position>();

  constructor(
    public readonly id: WalletId,
    public readonly account: PlayerAccount,
    positions: Position[] = [],
  ) {
    for (const position of positions) {
      this.positionsBySymbol.set(position.asset.symbol.value, position);
    }
  }

  get positions(): Position[] {
    return [...this.positionsBySymbol.values()];
  }

  getPosition(symbol: string): Position | undefined {
    return this.positionsBySymbol.get(symbol);
  }

  requirePosition(symbol: string): Position {
    const position = this.getPosition(symbol);
    if (!position) {
      throw new PositionNotFoundError(symbol);
    }

    return position;
  }

  buy(asset: Asset, quantity: Quantity, unitPrice: MoneyCents): void {
    const existing = this.positionsBySymbol.get(asset.symbol.value);
    if (existing) {
      existing.buy(quantity, unitPrice);
      return;
    }

    this.positionsBySymbol.set(
      asset.symbol.value,
      new Position(asset, quantity, unitPrice),
    );
  }

  sell(asset: Asset, quantity: Quantity): void {
    const position = this.requirePosition(asset.symbol.value);
    const shouldRemove = position.reduceToZeroAware(quantity);
    if (shouldRemove) {
      this.positionsBySymbol.delete(asset.symbol.value);
    }
  }

  investedValue(prices: MarketPrice[]): MoneyCents {
    return this.positions.reduce((total, position) => {
      const price = prices.find((item) =>
        item.asset.symbol.equals(position.asset.symbol),
      );
      return price ? total.add(position.marketValue(price.unitPrice)) : total;
    }, MoneyCents.zero());
  }

  totalEquity(prices: MarketPrice[]): MoneyCents {
    return this.account.availableBalance.add(this.investedValue(prices));
  }

  allocationByAssetType(prices: MarketPrice[]): AllocationValue[] {
    const values = new Map<AssetType, MoneyCents>();

    for (const position of this.positions) {
      const price = prices.find((item) =>
        item.asset.symbol.equals(position.asset.symbol),
      );
      if (!price) {
        continue;
      }

      const current = values.get(position.asset.type) ?? MoneyCents.zero();
      values.set(
        position.asset.type,
        current.add(position.marketValue(price.unitPrice)),
      );
    }

    const invested = [...values.values()].reduce(
      (total, value) => total.add(value),
      MoneyCents.zero(),
    );

    return [...values.entries()].map(([assetType, value]) => ({
      assetType,
      value,
      percentageBasisPoints:
        invested.cents === 0
          ? 0
          : Math.floor((value.cents * 10000) / invested.cents),
    }));
  }
}
