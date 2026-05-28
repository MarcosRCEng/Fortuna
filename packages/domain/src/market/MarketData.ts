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
  isRealData: boolean;
};

export type MarketHistoryRange =
  | "1d"
  | "5d"
  | "1mo"
  | "3mo"
  | "6mo"
  | "1y"
  | "5y"
  | "max";
export type MarketHistoryInterval = "1d" | "1wk" | "1mo";

export type HistoricalPriceInput = {
  range?: MarketHistoryRange;
  interval?: MarketHistoryInterval;
};

export type MarketDataProviderStatus = {
  provider: string;
  isAvailable: boolean;
  isRealDataEnabled: boolean;
  isUsingFallback: boolean;
  cacheEnabled: boolean;
  lastSuccessfulRequestAt?: string;
  lastFailureAt?: string;
  lastFailureReason?: string;
};

export type MarketProviderStatus = {
  provider: MarketDataProviderName;
  realDataEnabled: boolean;
  hasToken: boolean;
  cacheTtlSeconds: number;
  lastSuccessfulFetchAt?: string | null;
  status: "ok" | "degraded" | "mock_only";
};

export interface MarketDataProvider {
  getQuote(symbol: string): Promise<MarketQuote>;
  getQuotes(symbols: string[]): Promise<MarketQuote[]>;
  getHistoricalPrices(
    symbol: string,
    input: HistoricalPriceInput,
  ): Promise<HistoricalPrice[]>;
  getProviderStatus(): Promise<MarketDataProviderStatus>;
}
