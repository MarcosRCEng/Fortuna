import type { MarketDataProvider, MarketQuote } from "@fortuna/application";
import { Money } from "@fortuna/domain";

const MOCK_PRICES_IN_CENTS: Record<string, number> = {
  FORT3: 1234,
  TESOURO: 10000,
  CASH: 100
};

export class MockMarketDataProvider implements MarketDataProvider {
  async getQuote(symbol: string): Promise<MarketQuote> {
    const normalizedSymbol = symbol.toUpperCase();
    const priceInCents = MOCK_PRICES_IN_CENTS[normalizedSymbol] ?? 1000;

    return {
      symbol: normalizedSymbol,
      price: Money.fromCents(priceInCents),
      asOf: new Date(),
      provider: "mock"
    };
  }
}
