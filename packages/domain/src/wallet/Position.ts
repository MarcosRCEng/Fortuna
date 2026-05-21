import { Asset } from "../assets/Asset.js";
import { InsufficientPositionError } from "../errors/FinancialErrors.js";
import { MoneyCents } from "../money/Money.js";
import { Quantity } from "../value-objects/Quantity.js";

export class Position {
  constructor(
    public readonly asset: Asset,
    private quantity: Quantity,
    private averagePrice: MoneyCents,
  ) {}

  get totalQuantity(): Quantity {
    return this.quantity;
  }

  get averagePriceCents(): MoneyCents {
    return this.averagePrice;
  }

  buy(quantity: Quantity, unitPrice: MoneyCents): void {
    const previousCost = this.averagePrice.cents * this.quantity.units;
    const newCost = unitPrice.cents * quantity.units;
    const newQuantity = this.quantity.units + quantity.units;

    this.quantity = Quantity.fromUnits(newQuantity);
    // Half-up integer rounding keeps the weighted average deterministic in cents.
    this.averagePrice = MoneyCents.fromCents(
      Math.floor((previousCost + newCost + newQuantity / 2) / newQuantity),
    );
  }

  reduceToZeroAware(quantity: Quantity): boolean {
    if (!this.quantity.isGreaterThanOrEqual(quantity)) {
      throw new InsufficientPositionError();
    }

    const remaining = this.quantity.units - quantity.units;
    if (remaining === 0) {
      return true;
    }

    this.quantity = Quantity.fromUnits(remaining);
    return false;
  }

  marketValue(unitPrice: MoneyCents): MoneyCents {
    return unitPrice.multiplyByQuantity(this.quantity);
  }
}
