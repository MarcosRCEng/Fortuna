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

export type MarketProviderStatus = {
  provider: "brapi" | "mock" | "cache";
  realDataEnabled: boolean;
  hasBrapiToken: boolean;
  cacheTtlSeconds: number;
  catalogCacheTtlSeconds: number;
  catalogMaxPageSize: number;
  catalogProviderConcurrency: number;
  allowedSymbols: string[];
  capabilities: MarketProviderCapabilities;
  lastSuccessfulFetchAt: string | null;
  status: "ok" | "degraded" | "mock_only";
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

export type MarketCatalogQuery = {
  search?: string;
  types?: MarketAssetType[];
  sectors?: string[];
  sortBy?: MarketCatalogSortBy;
  sortOrder?: MarketCatalogSortOrder;
  page: number;
  pageSize: number;
};

export type WatchlistSortBy =
  | "position"
  | "symbol"
  | "name"
  | "price"
  | "changePercent";

export type WatchlistQuoteStatus = "AVAILABLE" | "STALE" | "UNAVAILABLE";

export type WatchlistPreferences = {
  visibleGroups: MarketAssetGroup[];
  portfolioOnly: boolean;
  sortBy: WatchlistSortBy;
  sortOrder: MarketCatalogSortOrder;
  maxItemsPerGroup?: number;
};

export type WatchlistItem = {
  symbol: string;
  name?: string;
  type: MarketAssetType;
  group: MarketAssetGroup;
  position: number;
  inPortfolio: boolean;
  quantity?: number;
  priceCents?: number;
  changePercent?: number;
  quoteStatus: WatchlistQuoteStatus;
};

export type PlayerWatchlist = {
  playerId: string;
  preferences: WatchlistPreferences;
  items: WatchlistItem[];
  createdAt: string;
  updatedAt: string;
};
