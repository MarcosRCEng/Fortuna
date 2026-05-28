export type MarketAssetType =
  | "stock"
  | "fii"
  | "etf"
  | "bdr"
  | "index"
  | "crypto"
  | "unknown";

export type MarketDataProviderName = "brapi" | "mock" | "cache";

export type MarketAsset = {
  symbol: string;
  name: string;
  assetType: MarketAssetType;
  currency: "BRL" | "USD";
};

export type MarketQuote = MarketAsset & {
  priceInCents: number;
  regularMarketChangePercent: number;
  regularMarketChangeInCents?: number;
  regularMarketPreviousCloseInCents?: number;
  marketTime: string;
  provider: MarketDataProviderName;
  isRealData: boolean;
  isDelayed: boolean;
};

export type HistoricalPrice = {
  symbol: string;
  date: string;
  openInCents?: number;
  highInCents?: number;
  lowInCents?: number;
  closeInCents: number;
  volume?: number;
  provider: MarketDataProviderName;
};

export type MarketHistoryRange = "1mo" | "3mo" | "6mo" | "1y";
export type MarketHistoryInterval = "1d";

export type MarketProviderStatus = {
  provider: MarketDataProviderName;
  realDataEnabled: boolean;
  hasToken: boolean;
  cacheTtlSeconds: number;
  lastSuccessfulFetchAt?: string | null;
  status: "ok" | "degraded" | "mock_only";
};

export interface MarketDataProvider {
  getQuotes(symbols: string[]): Promise<MarketQuote[]>;
  getHistoricalPrices(params: {
    symbol: string;
    range: MarketHistoryRange;
    interval: MarketHistoryInterval;
  }): Promise<HistoricalPrice[]>;
  getStatus(): Promise<MarketProviderStatus>;
}
