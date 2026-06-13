export type MarketAssetType =
  | "STOCK"
  | "UNIT"
  | "FII"
  | "ETF"
  | "FI_INFRA"
  | "FI_AGRO"
  | "FIP"
  | "FIDC"
  | "BDR"
  | "TREASURY"
  | "UNKNOWN";

export type MarketAssetGroup =
  | "EQUITIES"
  | "REAL_ESTATE_FUNDS"
  | "EXCHANGE_TRADED_FUNDS"
  | "OTHER_LISTED_FUNDS"
  | "FIXED_INCOME"
  | "UNKNOWN";

export type MarketDataProviderName = "brapi" | "mock" | "cache";

export type MarketCatalogSortBy =
  | "name"
  | "price"
  | "changePercent"
  | "volume"
  | "marketCap";

export type MarketCatalogSortOrder = "asc" | "desc";

export type MarketCatalogSource = "BRAPI" | "MOCK" | "CACHE";

export type MarketProviderCapabilities = {
  listedCatalog: boolean;
  basicQuotes: boolean;
  detailedFiiData: boolean;
  treasury: boolean;
  analystConsensus: false;
};

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

export type MarketCatalogQuery = {
  search?: string;
  assetTypes?: MarketAssetType[];
  sectors?: string[];
  sortBy?: MarketCatalogSortBy;
  sortOrder?: MarketCatalogSortOrder;
  page: number;
  pageSize: number;
};

export type MarketCatalogItem = {
  symbol: string;
  name: string;
  type: MarketAssetType;
  group: MarketAssetGroup;
  sector?: string;
  priceCents?: number;
  changePercent?: number;
  volume?: number;
  marketCapCents?: number;
  logoUrl?: string;
  currency: "BRL";
  tradableInFortuna: boolean;
};

export type MarketCatalogPage = {
  items: MarketCatalogItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  source: MarketCatalogSource;
  delayed: boolean;
  fetchedAt: string;
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
  catalogCacheTtlSeconds: number;
  catalogMaxPageSize: number;
  catalogProviderConcurrency: number;
  capabilities: MarketProviderCapabilities;
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
