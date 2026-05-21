import type { Asset } from "../assets/Asset.js";
import type { MoneyCents } from "../money/Money.js";
import type { Quantity } from "../value-objects/Quantity.js";

export enum OrderSide {
  BUY = "BUY",
  SELL = "SELL",
}

export enum OrderStatus {
  CREATED = "CREATED",
  EXECUTED = "EXECUTED",
  REJECTED = "REJECTED",
}

export class Order {
  constructor(
    public readonly id: string,
    public readonly side: OrderSide,
    public readonly asset: Asset,
    public readonly quantity: Quantity,
    public readonly unitPrice: MoneyCents,
    public readonly createdAt: Date,
    public readonly status: OrderStatus = OrderStatus.CREATED,
  ) {}

  get total(): MoneyCents {
    return this.unitPrice.multiplyByQuantity(this.quantity);
  }
}
