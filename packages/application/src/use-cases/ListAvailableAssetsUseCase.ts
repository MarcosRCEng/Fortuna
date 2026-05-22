import type { Asset, MarketDataProvider } from "../ports/MarketDataProvider.js";

export class ListAvailableAssetsUseCase {
  constructor(private readonly marketData: MarketDataProvider) {}

  execute(): Promise<Asset[]> {
    return this.marketData.listAssets();
  }
}
