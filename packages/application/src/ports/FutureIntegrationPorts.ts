import type { MoneyCents } from "@fortuna/domain";

import type {
  AuditEvent,
  AuditEventType,
  RecordAuditEventInput,
} from "../events/AuditEvents.js";
import type {
  Asset,
  AssetPrice,
  MarketDataSource,
  MarketProviderStatus,
  MarketQuote,
  MarketSessionStatus,
  PriceStatus,
} from "./MarketDataProvider.js";

export enum DataEnvironment {
  SIMULATED = "SIMULATED",
  REAL_READ_ONLY = "REAL_READ_ONLY",
  REAL_TRANSACTIONAL = "REAL_TRANSACTIONAL",
}

export enum ConsentStatus {
  ACTIVE = "ACTIVE",
  REVOKED = "REVOKED",
  EXPIRED = "EXPIRED",
  PENDING = "PENDING",
}

export enum ConsentScope {
  REAL_MARKET_DATA = "REAL_MARKET_DATA",
  REAL_PORTFOLIO_READ = "REAL_PORTFOLIO_READ",
  BROKER_ACCOUNT_READ = "BROKER_ACCOUNT_READ",
  BROKER_ORDERS_READ = "BROKER_ORDERS_READ",
  BROKER_ORDER_EXECUTION = "BROKER_ORDER_EXECUTION",
}

export enum BrokerOrderSide {
  BUY = "BUY",
  SELL = "SELL",
}

export enum BrokerOrderType {
  MARKET = "MARKET",
  LIMIT = "LIMIT",
}

export enum ProviderHealthStatus {
  HEALTHY = "HEALTHY",
  DEGRADED = "DEGRADED",
  UNAVAILABLE = "UNAVAILABLE",
  DISABLED = "DISABLED",
}

export interface ProviderPriceQuote {
  providerName: string;
  externalSymbol: string;
  priceCents: number;
  currency: string;
  marketTimestamp: Date;
  receivedAt: Date;
  source: MarketDataSource | string;
  priceStatus: PriceStatus;
  rawReferenceId?: string;
}

export interface MarketPriceSnapshot {
  assetId: string;
  internalSymbol: string;
  priceCents: number;
  currency: string;
  marketTimestamp: Date;
  receivedAt: Date;
  source: MarketDataSource | string;
  priceStatus: PriceStatus;
  providerQuote?: ProviderPriceQuote;
}

export interface RealPortfolioSnapshot {
  id: string;
  userId: string;
  consentId: string;
  providerName: string;
  importedAt: Date;
  positions: ImportedPortfolioPosition[];
  sourceEnvironment: DataEnvironment.REAL_READ_ONLY;
}

export interface ImportedPortfolioPosition {
  assetId: string;
  externalSymbol: string;
  quantity: number;
  averagePriceCents?: number;
  grossValueCents?: number;
  currency: string;
  providerName: string;
  importedAt: Date;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  scopes: ConsentScope[];
  status: ConsentStatus;
  providerName?: string;
  createdAt: Date;
  revokedAt?: Date;
  expiresAt?: Date;
  metadata: Record<string, unknown>;
}

export interface CreateConsentInput {
  userId: string;
  scopes: ConsentScope[];
  providerName?: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface AssetNormalizationInput {
  providerName: string;
  externalSymbol: string;
  externalAssetId?: string;
  name?: string;
  currency?: string;
  exchange?: string;
  rawPayload?: unknown;
}

export interface AssetNormalizationResult {
  assetId: string;
  internalSymbol: string;
  providerSymbol: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  warnings: string[];
}

export interface ProviderHealthCheck {
  providerName: string;
  status: ProviderHealthStatus;
  checkedAt: Date;
  latencyMs?: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface MarketClockStatus {
  market: string;
  timezone: string;
  status: MarketSessionStatus;
  checkedAt: Date;
  nextOpenAt?: Date;
  nextCloseAt?: Date;
  reason?: string;
}

export interface PortfolioImportProvider {
  importPortfolioSnapshot(
    userId: string,
    consentId: string,
  ): Promise<RealPortfolioSnapshot>;
  listSupportedInstitutions(): Promise<string[]>;
  validateConnection(
    userId: string,
    consentId: string,
  ): Promise<ProviderHealthCheck>;
}

export interface BrokerAccountSummary {
  accountId: string;
  userId: string;
  providerName: string;
  availableCashCents?: number;
  grossPortfolioValueCents?: number;
  currency: string;
  importedAt: Date;
}

export interface BrokerOrder {
  id: string;
  providerName: string;
  assetId: string;
  externalSymbol: string;
  side: BrokerOrderSide;
  orderType: BrokerOrderType;
  quantity: number;
  limitPriceCents?: number;
  status: string;
  createdAt: Date;
}

export interface PlaceBrokerOrderInput {
  userId: string;
  consentId: string;
  assetId: string;
  side: BrokerOrderSide;
  orderType: BrokerOrderType;
  quantity: number;
  limitPriceCents?: number;
  clientRequestId: string;
}

export interface BrokerIntegrationProvider {
  getAccountSummary(
    userId: string,
    consentId: string,
  ): Promise<BrokerAccountSummary>;
  getPositions(
    userId: string,
    consentId: string,
  ): Promise<ImportedPortfolioPosition[]>;
  getOrders(userId: string, consentId: string): Promise<BrokerOrder[]>;
  placeOrder(input: PlaceBrokerOrderInput): Promise<BrokerOrder>;
}

export interface ConsentService {
  createConsent(input: CreateConsentInput): Promise<ConsentRecord>;
  revokeConsent(consentId: string, userId: string): Promise<ConsentRecord>;
  getConsentStatus(consentId: string, userId: string): Promise<ConsentStatus>;
  listConsentHistory(userId: string): Promise<ConsentRecord[]>;
}

export interface AuditService {
  recordEvent(input: RecordAuditEventInput): Promise<AuditEvent>;
  listEventsByUser(userId: string): Promise<AuditEvent[]>;
  listEventsByEntity(
    entityType: string,
    entityId: string,
  ): Promise<AuditEvent[]>;
}

export interface MentorMessageValidationInput {
  userId?: string;
  playerId?: string;
  message: string;
  context: "SIMULATION" | "EDUCATION" | "GENERAL_INFORMATION" | "REAL_DATA";
  metadata?: Record<string, unknown>;
}

export interface ComplianceValidationResult {
  allowed: boolean;
  policyCode: string;
  warnings: string[];
  blockedReason?: string;
}

export interface CompliancePolicyService {
  validateMentorMessage(
    input: MentorMessageValidationInput,
  ): Promise<ComplianceValidationResult>;
  validateSimulationDisclaimer(
    surface: string,
  ): Promise<ComplianceValidationResult>;
  validateRealDataAccess(
    userId: string,
    consentId: string,
  ): Promise<ComplianceValidationResult>;
}

export interface ProviderHealthService {
  getProviderHealth(providerName: string): Promise<ProviderHealthCheck>;
  listProviderHealth(): Promise<ProviderHealthCheck[]>;
  recordProviderFailure(
    providerName: string,
    error: Error,
    metadata?: Record<string, unknown>,
  ): Promise<void>;
}

export interface MarketClockService {
  getMarketStatus(market: string, at?: Date): Promise<MarketClockStatus>;
  isTradingSessionOpen(market: string, at?: Date): Promise<boolean>;
}

export interface AssetNormalizationService {
  normalizeAsset(
    input: AssetNormalizationInput,
  ): Promise<AssetNormalizationResult>;
  normalizeQuote(quote: ProviderPriceQuote): Promise<MarketPriceSnapshot>;
}

export interface FutureMarketDataProviderSelection {
  providerName: string;
  source: MarketDataSource | string;
  environment: DataEnvironment;
  priority: number;
  enabled: boolean;
}

export interface MarketDataProviderVNext {
  listAssets(): Promise<Asset[]>;
  getAssetQuote(assetIdOrTicker: string): Promise<MarketQuote>;
  getMarketStatus(): Promise<MarketProviderStatus>;
  getProviderHealth(): Promise<ProviderHealthCheck>;
  getNormalizedPriceSnapshot(
    assetIdOrTicker: string,
  ): Promise<MarketPriceSnapshot>;
}

export interface SimulatedTransactionContract {
  id: string;
  playerId: string;
  assetId: string;
  quantity: number;
  unitPriceCents: MoneyCents;
  totalAmountCents: MoneyCents;
  occurredAt: Date;
  environment: DataEnvironment.SIMULATED;
}

export const FUTURE_AUDIT_EVENT_TYPES: readonly AuditEventType[] = [] as const;
