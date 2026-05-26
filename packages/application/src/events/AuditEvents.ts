export enum AuditEventType {
  PLAYER_CREATED = "PLAYER_CREATED",
  SIMULATED_ASSET_BOUGHT = "SIMULATED_ASSET_BOUGHT",
  SIMULATED_ASSET_SOLD = "SIMULATED_ASSET_SOLD",
  SIMULATED_INCOME_COLLECTED = "SIMULATED_INCOME_COLLECTED",
  MOCK_MARKET_PRICE_REFRESHED = "MOCK_MARKET_PRICE_REFRESHED",
  MISSION_COMPLETED = "MISSION_COMPLETED",
  CITY_UPDATED = "CITY_UPDATED",
  MARKET_PROVIDER_FALLBACK_USED = "MARKET_PROVIDER_FALLBACK_USED",
  FINANCIAL_BUSINESS_ERROR = "FINANCIAL_BUSINESS_ERROR",
  CONSENT_ACCEPTED = "CONSENT_ACCEPTED",
  CONSENT_REVOKED = "CONSENT_REVOKED",
  SIMULATED_WALLET_CREATED = "SIMULATED_WALLET_CREATED",
  SIMULATED_BUY_EXECUTED = "SIMULATED_BUY_EXECUTED",
  SIMULATED_SELL_EXECUTED = "SIMULATED_SELL_EXECUTED",
  MARKET_DATA_REQUESTED = "MARKET_DATA_REQUESTED",
  MARKET_DATA_PROVIDER_FAILED = "MARKET_DATA_PROVIDER_FAILED",
  CONSENT_CREATED = "CONSENT_CREATED",
  REAL_PORTFOLIO_IMPORTED = "REAL_PORTFOLIO_IMPORTED",
  MENTOR_MESSAGE_SHOWN = "MENTOR_MESSAGE_SHOWN",
  COMPLIANCE_WARNING_SHOWN = "COMPLIANCE_WARNING_SHOWN",
  FEATURE_FLAG_CHANGED = "FEATURE_FLAG_CHANGED",
}

export enum AuditSeverity {
  INFO = "INFO",
  WARNING = "WARNING",
  ERROR = "ERROR",
}

export enum AuditEnvironment {
  LOCAL = "LOCAL",
  DEV = "DEV",
  HOMOLOGATION = "HOMOLOGATION",
  PRODUCTION = "PRODUCTION",
}

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  eventType?: AuditEventType;
  userId?: string;
  playerId?: string;
  entityType: string;
  entityId: string;
  occurredAt: Date;
  createdAt?: Date;
  metadata: Record<string, unknown>;
  payload?: Record<string, unknown>;
  source: string;
  severity?: AuditSeverity;
  environment: AuditEnvironment;
  correlationId: string;
}

export interface RecordAuditEventInput {
  type: AuditEventType;
  userId?: string;
  playerId?: string;
  entityType: string;
  entityId: string;
  occurredAt?: Date;
  metadata?: Record<string, unknown>;
  source: string;
  environment: AuditEnvironment;
  correlationId: string;
}

export interface AuditEventInput {
  playerId?: string;
  eventType: AuditEventType;
  entityType: string;
  entityId: string;
  correlationId?: string;
  source: string;
  severity?: AuditSeverity;
  payload?: Record<string, unknown>;
  createdAt?: Date;
}
