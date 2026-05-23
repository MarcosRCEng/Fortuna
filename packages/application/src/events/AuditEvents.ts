export enum AuditEventType {
  PLAYER_CREATED = "PLAYER_CREATED",
  SIMULATED_WALLET_CREATED = "SIMULATED_WALLET_CREATED",
  SIMULATED_BUY_EXECUTED = "SIMULATED_BUY_EXECUTED",
  SIMULATED_SELL_EXECUTED = "SIMULATED_SELL_EXECUTED",
  MARKET_DATA_REQUESTED = "MARKET_DATA_REQUESTED",
  MARKET_DATA_PROVIDER_FAILED = "MARKET_DATA_PROVIDER_FAILED",
  CONSENT_CREATED = "CONSENT_CREATED",
  CONSENT_REVOKED = "CONSENT_REVOKED",
  REAL_PORTFOLIO_IMPORTED = "REAL_PORTFOLIO_IMPORTED",
  MENTOR_MESSAGE_SHOWN = "MENTOR_MESSAGE_SHOWN",
  COMPLIANCE_WARNING_SHOWN = "COMPLIANCE_WARNING_SHOWN",
  FEATURE_FLAG_CHANGED = "FEATURE_FLAG_CHANGED",
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
  userId?: string;
  playerId?: string;
  entityType: string;
  entityId: string;
  occurredAt: Date;
  metadata: Record<string, unknown>;
  source: string;
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
