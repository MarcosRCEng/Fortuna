export const FUTURE_INTEGRATION_FLAGS = {
  ENABLE_REAL_MARKET_DATA: false,
  ENABLE_PORTFOLIO_IMPORT: false,
  ENABLE_BROKER_INTEGRATION: false,
  ENABLE_REAL_PORTFOLIO_VIEW: false,
  ENABLE_TRANSACTIONAL_BROKER_ACTIONS: false,
  ENABLE_COMPLIANCE_STRICT_MODE: true,
  ENABLE_AUDIT_LOG_EXPORT: false,
  ENABLE_PROVIDER_FALLBACK: false,
  ENABLE_MARKET_DATA_CACHE: false,
} as const;

export type FutureIntegrationFlagName = keyof typeof FUTURE_INTEGRATION_FLAGS;

export type FutureIntegrationFlags = Record<FutureIntegrationFlagName, boolean>;

export interface FeatureFlagService {
  isEnabled(flag: FutureIntegrationFlagName): boolean;
  getAll(): FutureIntegrationFlags;
}
