import { Money } from "@fortuna/domain";

export interface MarketQuote {
  symbol: string;
  price: Money;
  asOf: Date;
  provider: string;
}

export interface MarketDataProvider {
  getQuote(symbol: string): Promise<MarketQuote>;
}
