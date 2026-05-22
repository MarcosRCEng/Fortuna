import type {
  AssetPrice,
  MarketDataProvider,
} from "../ports/MarketDataProvider.js";

export class GetCurrentAssetPriceUseCase {
  constructor(private readonly marketData: MarketDataProvider) {}

  execute(symbol: string): Promise<AssetPrice | undefined> {
    return this.marketData.getCurrentPrice(symbol);
  }
}
