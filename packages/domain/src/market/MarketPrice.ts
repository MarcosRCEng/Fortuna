import type { Asset } from "../assets/Asset.js";
import type { MoneyCents } from "../money/Money.js";

export type MarketPriceProviderMetadata = {
  marketPriceProvider: "brapi" | "mock" | "cache" | "fallback" | string;
  marketPriceIsRealData: boolean;
  marketPriceIsDelayed: boolean;
};

export class MarketPrice {
  constructor(
    public readonly asset: Asset,
    public readonly unitPrice: MoneyCents,
    public readonly asOf: Date,
    public readonly metadata: MarketPriceProviderMetadata = {
      marketPriceProvider: "mock",
      marketPriceIsRealData: false,
      marketPriceIsDelayed: false,
    },
  ) {}
}
