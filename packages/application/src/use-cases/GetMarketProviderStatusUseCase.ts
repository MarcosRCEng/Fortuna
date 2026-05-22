import type {
  MarketDataProvider,
  MarketProviderStatus,
} from "../ports/MarketDataProvider.js";

export class GetMarketProviderStatusUseCase {
  constructor(private readonly marketData: MarketDataProvider) {}

  execute(): Promise<MarketProviderStatus> {
    return this.marketData.getProviderStatus();
  }
}
