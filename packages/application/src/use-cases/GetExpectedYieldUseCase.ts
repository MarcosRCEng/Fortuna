import type {
  ExpectedYield,
  MarketDataProvider,
} from "../ports/MarketDataProvider.js";

export class GetExpectedYieldUseCase {
  constructor(private readonly marketData: MarketDataProvider) {}

  execute(symbol: string): Promise<ExpectedYield | undefined> {
    return this.marketData.getExpectedYield(symbol);
  }
}
