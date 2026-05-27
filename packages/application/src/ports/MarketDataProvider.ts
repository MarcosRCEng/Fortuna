import type { MoneyCents } from "@fortuna/domain";

export enum AssetClass {
  CASH = "CASH",
  FIXED_INCOME = "FIXED_INCOME",
  FII = "FII",
  STOCK = "STOCK",
}

export enum MarketRiskLevel {
  NONE = "NONE",
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  MEDIUM_HIGH = "MEDIUM_HIGH",
  HIGH = "HIGH",
}

export enum LiquidityLevel {
  IMMEDIATE = "IMMEDIATE",
  DAILY = "DAILY",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

export enum PriceStatus {
  UPDATED = "UPDATED",
  STALE = "STALE",
  SIMULATED = "SIMULATED",
  UNAVAILABLE = "UNAVAILABLE",
}

export enum MarketDataSource {
  MOCK = "MOCK",
  EXTERNAL = "EXTERNAL",
  BRAPI = "BRAPI",
  B3 = "B3",
  GOOGLE_FINANCE = "GOOGLE_FINANCE",
  MSN_MONEY = "MSN_MONEY",
  CACHE = "CACHE",
  FALLBACK = "FALLBACK",
}

export enum YieldType {
  NONE = "NONE",
  FIXED_RATE = "FIXED_RATE",
  DISTRIBUTION = "DISTRIBUTION",
  EVENTUAL_DIVIDEND = "EVENTUAL_DIVIDEND",
}

export enum YieldPeriodicity {
  NONE = "NONE",
  DAILY = "DAILY",
  MONTHLY = "MONTHLY",
  EVENTUAL = "EVENTUAL",
}

export enum MarketSessionStatus {
  OPEN = "OPEN",
  CLOSED = "CLOSED",
  PROVIDER_FAILURE = "PROVIDER_FAILURE",
  SIMULATED = "SIMULATED",
}

export enum MarketDataProviderType {
  MOCK = "MOCK",
  EXTERNAL = "EXTERNAL",
  CACHE = "CACHE",
  FALLBACK = "FALLBACK",
}

export type MarketDataTraceSource = "brapi" | "mock" | "cache" | "fallback";

export enum MarketDataErrorCode {
  HTTP_ERROR = "HTTP_ERROR",
  TIMEOUT = "TIMEOUT",
  EMPTY_RESPONSE = "EMPTY_RESPONSE",
  ASSET_NOT_FOUND = "ASSET_NOT_FOUND",
  RATE_LIMITED = "RATE_LIMITED",
  MISSING_TOKEN = "MISSING_TOKEN",
  PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE",
  INVALID_RESPONSE = "INVALID_RESPONSE",
}

export interface MarketDataError {
  code: MarketDataErrorCode;
  message: string;
  symbol?: string;
  statusCode?: number;
  providerName: string;
}

export interface MarketDataTrace {
  source: MarketDataTraceSource;
  providerName: string;
  isRealData: boolean;
  isCached: boolean;
  isFallback: boolean;
  fetchedAt: Date;
  disclaimer: string;
}

export interface MarketQuoteDTO {
  symbol: string;
  name?: string;
  priceCents: number;
  previousPriceCents?: number;
  variationBps: number;
  currency: string;
  marketTimestamp: Date;
  updatedAt: Date;
  priceStatus: PriceStatus;
  dataSource: MarketDataSource;
  trace: MarketDataTrace;
}

export interface GetQuotesInput {
  symbols: string[];
  requireToken?: boolean;
}

export interface GetQuotesOutput {
  quotes: MarketQuoteDTO[];
  errors: MarketDataError[];
  trace: MarketDataTrace;
}

export interface GetHistoricalPricesInput {
  symbol: string;
  from?: Date;
  to?: Date;
  range?: string;
  interval?: string;
  requireToken?: boolean;
}

export interface GetHistoricalPricesOutput {
  symbol: string;
  prices: AssetHistoryPoint[];
  errors: MarketDataError[];
  trace: MarketDataTrace;
}

export const EDUCATIONAL_MARKET_DATA_DISCLAIMER =
  "Uso educativo. Dados podem ter atraso, nao sao recomendacao de compra ou venda, a carteira continua simulada e nao ha investimento real.";

export interface ExpectedYield {
  symbol: string;
  yieldType: YieldType;
  periodicity: YieldPeriodicity;
  amountPerUnitCents?: number;
  rateBps?: number;
  description: string;
  nextPaymentDate?: Date;
}

export interface EducationalAssetInfo {
  symbol: string;
  shortDescription: string;
  longDescription: string;
  riskExplanation: string;
  liquidityExplanation: string;
  beginnerTip: string;
  mentorHint: string;
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  currentPriceCents: number;
  previousPriceCents?: number;
  variationBps: number;
  riskLevel: MarketRiskLevel;
  liquidity: LiquidityLevel;
  expectedYield: ExpectedYield;
  educationalDescription: string;
  yieldRules: string;
  isMocked: boolean;
  priceStatus: PriceStatus;
  dataSource: MarketDataSource;
  updatedAt: Date;
}

export type MarketAssetDTO = Asset;

export interface AssetPrice {
  assetId: string;
  symbol: string;
  priceCents: number;
  previousPriceCents?: number;
  variationBps: number;
  priceStatus: PriceStatus;
  dataSource: MarketDataSource;
  marketTimestamp: Date;
  updatedAt: Date;
}

export type MarketPriceDTO = AssetPrice;

export interface AssetHistoryPoint {
  symbol: string;
  date: Date;
  openPriceCents: number;
  closePriceCents: number;
  minPriceCents: number;
  maxPriceCents: number;
  volume?: number;
}

export type MarketYieldDTO = ExpectedYield;

export interface PriceHistoryOptions {
  from?: Date;
  to?: Date;
}

export interface MarketRefreshResultDTO {
  refreshedAt: Date;
  updatedAssets: Asset[];
  providerName: string;
  providerType: MarketDataProviderType;
}

export interface MarketQuote {
  symbol: string;
  price: MoneyCents;
  asOf: Date;
  provider: MarketDataSource | string;
  priceStatus: PriceStatus;
}

export interface PriceHistoryRequest {
  symbol: string;
  from: Date;
  to: Date;
}

export interface RefreshMarketPricesRequest {
  asOf?: Date;
}

export interface MarketProviderStatus {
  sessionStatus: MarketSessionStatus;
  dataSource: MarketDataSource;
  priceStatus: PriceStatus;
  checkedAt: Date;
  message?: string;
}

export interface MarketDataProvider {
  getProviderName(): string;
  getProviderType(): MarketDataProviderType;
  getQuotes(input: GetQuotesInput): Promise<GetQuotesOutput>;
  getHistoricalPrices(
    input: GetHistoricalPricesInput,
  ): Promise<GetHistoricalPricesOutput>;
  listAssets(): Promise<Asset[]>;
  getAssetById(assetId: string): Promise<Asset | null>;
  getAsset(symbol: string): Promise<Asset | undefined>;
  getCurrentPrice(symbol: string): Promise<AssetPrice | undefined>;
  getQuote(symbol: string): Promise<MarketQuote>;
  getPriceHistory(request: PriceHistoryRequest): Promise<AssetHistoryPoint[]>;
  getPriceHistory(
    assetId: string,
    options?: PriceHistoryOptions,
  ): Promise<AssetHistoryPoint[]>;
  getYieldInfo(assetId: string): Promise<ExpectedYield | null>;
  getExpectedYield(symbol: string): Promise<ExpectedYield | undefined>;
  getEducationalInfo(symbol: string): Promise<EducationalAssetInfo | undefined>;
  refreshPrices(request?: RefreshMarketPricesRequest): Promise<Asset[]>;
  getProviderStatus(): Promise<MarketProviderStatus>;
}
