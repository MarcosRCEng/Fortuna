import type { Asset, MarketPrice } from "@fortuna/domain";

export interface MarketPriceProvider {
  getCurrentPrice(asset: Asset): Promise<MarketPrice>;
  getCurrentPrices(assets: Asset[]): Promise<MarketPrice[]>;
}
