import type { Asset } from "../assets/Asset.js";
import type { MoneyCents } from "../money/Money.js";

export class MarketPrice {
  constructor(
    public readonly asset: Asset,
    public readonly unitPrice: MoneyCents,
    public readonly asOf: Date,
  ) {}
}
