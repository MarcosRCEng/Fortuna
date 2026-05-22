import type { Asset, MarketDataProvider } from "../ports/MarketDataProvider.js";

export interface RefreshMockMarketPricesCommand {
  asOf?: Date;
}

export class RefreshMockMarketPricesUseCase {
  constructor(private readonly marketData: MarketDataProvider) {}

  execute(command: RefreshMockMarketPricesCommand = {}): Promise<Asset[]> {
    return this.marketData.refreshPrices(command);
  }
}
