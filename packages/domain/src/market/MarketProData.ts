export type MarketProDataState =
  | "REAL"
  | "MOCKED"
  | "DELAYED"
  | "UNAVAILABLE"
  | "NOT_AVAILABLE_IN_CURRENT_PLAN";

export type MarketProDataSource = "BRAPI" | "MOCK" | "CACHE" | "FALLBACK";

export type FiiManagementType =
  | "ACTIVE"
  | "PASSIVE"
  | "HYBRID"
  | "UNAVAILABLE";

export type FiiMandate =
  | "BRICK"
  | "PAPER"
  | "HYBRID"
  | "FUNDS_OF_FUNDS"
  | "DEVELOPMENT"
  | "UNAVAILABLE";

export type FiiDetails = {
  symbol: string;
  priceToBookBps?: number;
  dividendYield12MonthsBps?: number;
  equityValueCents?: number;
  vacancyBps?: number;
  segment?: string;
  managementType?: FiiManagementType;
  mandate?: FiiMandate;
  shareholderCount?: number;
  referenceDate: string;
  source: MarketProDataSource;
  delayMinutes?: number;
  dataState: MarketProDataState;
};

export type FiiDividend = {
  symbol: string;
  amountCents: number;
  paymentDate: string;
  baseDate?: string;
  source: MarketProDataSource;
  dataState: MarketProDataState;
};

export type TreasuryBondType =
  | "SELIC"
  | "PREFIXED"
  | "IPCA"
  | "RENDA_PLUS"
  | "EDUCA_PLUS"
  | "UNKNOWN";

export type TreasuryIndexer =
  | "SELIC"
  | "PREFIXED"
  | "IPCA"
  | "IGPM"
  | "UNKNOWN";

export type TreasuryCouponType = "NONE" | "SEMIANNUAL" | "MONTHLY" | "UNKNOWN";

export type TreasuryRateInterpretation =
  | "ANNUAL_PERCENT"
  | "SPREAD_OVER_INDEXER"
  | "UNKNOWN";

export type TreasuryBond = {
  symbol: string;
  name: string;
  bondType: TreasuryBondType;
  indexer: TreasuryIndexer;
  couponType: TreasuryCouponType;
  maturityDate: string;
  buyRateBps?: number;
  sellRateBps?: number;
  rateInterpretation: TreasuryRateInterpretation;
  buyPriceCents?: number;
  sellPriceCents?: number;
  basePriceCents?: number;
  durationDays?: number;
  referenceDate: string;
  source: MarketProDataSource;
  dataState: MarketProDataState;
};

export type TreasuryCatalogQuery = {
  search?: string;
  page: number;
  pageSize: number;
};

export type TreasuryCatalogPage = {
  items: TreasuryBond[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  source: MarketProDataSource;
  dataState: MarketProDataState;
  fetchedAt: string;
};

export type TreasuryIndicator = {
  symbol: string;
  buyRateBps?: number;
  sellRateBps?: number;
  buyPriceCents?: number;
  sellPriceCents?: number;
  basePriceCents?: number;
  referenceDate: string;
  source: MarketProDataSource;
  dataState: MarketProDataState;
};

export type TreasuryHistoryQuery = {
  symbol: string;
  from?: string;
  to?: string;
};

export type TreasuryHistoryPoint = {
  symbol: string;
  date: string;
  buyRateBps?: number;
  sellRateBps?: number;
  buyPriceCents?: number;
  sellPriceCents?: number;
  basePriceCents?: number;
};

export type TreasuryHistory = {
  symbol: string;
  points: TreasuryHistoryPoint[];
  source: MarketProDataSource;
  dataState: MarketProDataState;
  fetchedAt: string;
};
