import { AppError } from "./AppError.js";

export class ProviderUnavailableError extends AppError {
  constructor(context: Record<string, unknown> = {}) {
    super(
      "Market data provider is unavailable.",
      "PROVIDER_UNAVAILABLE",
      context,
    );
    this.name = "ProviderUnavailableError";
  }
}

export class ProviderRateLimitError extends AppError {
  constructor(context: Record<string, unknown> = {}) {
    super(
      "Market data provider rate limit was reached.",
      "PROVIDER_RATE_LIMIT",
      context,
    );
    this.name = "ProviderRateLimitError";
  }
}

export class AssetNotFoundError extends AppError {
  constructor(context: Record<string, unknown> = {}) {
    super(
      "Asset was not found in the selected provider.",
      "ASSET_NOT_FOUND",
      context,
    );
    this.name = "AssetNotFoundError";
  }
}

export class StaleMarketDataError extends AppError {
  constructor(context: Record<string, unknown> = {}) {
    super(
      "Market data is stale or older than the accepted policy.",
      "STALE_MARKET_DATA",
      context,
    );
    this.name = "StaleMarketDataError";
  }
}

export class MarketClosedError extends AppError {
  constructor(context: Record<string, unknown> = {}) {
    super(
      "Market is closed for the requested operation.",
      "MARKET_CLOSED",
      context,
    );
    this.name = "MarketClosedError";
  }
}

export class ConsentRequiredError extends AppError {
  constructor(context: Record<string, unknown> = {}) {
    super(
      "Explicit consent is required for this access.",
      "CONSENT_REQUIRED",
      context,
    );
    this.name = "ConsentRequiredError";
  }
}

export class ConsentRevokedError extends AppError {
  constructor(context: Record<string, unknown> = {}) {
    super(
      "Consent was revoked and can no longer be used.",
      "CONSENT_REVOKED",
      context,
    );
    this.name = "ConsentRevokedError";
  }
}

export class UnauthorizedAccessError extends AppError {
  constructor(context: Record<string, unknown> = {}) {
    super(
      "User is not authorized to access this resource.",
      "UNAUTHORIZED_ACCESS",
      context,
    );
    this.name = "UnauthorizedAccessError";
  }
}

export class RealDataNotEnabledError extends AppError {
  constructor(context: Record<string, unknown> = {}) {
    super(
      "Real data access is disabled by feature flag or environment.",
      "REAL_DATA_NOT_ENABLED",
      context,
    );
    this.name = "RealDataNotEnabledError";
  }
}

export class SimulationOnlyError extends AppError {
  constructor(context: Record<string, unknown> = {}) {
    super(
      "This action is available only in the simulated environment.",
      "SIMULATION_ONLY",
      context,
    );
    this.name = "SimulationOnlyError";
  }
}

export class ComplianceViolationError extends AppError {
  constructor(context: Record<string, unknown> = {}) {
    super(
      "The requested action violates a compliance policy.",
      "COMPLIANCE_VIOLATION",
      context,
    );
    this.name = "ComplianceViolationError";
  }
}

export class InvalidMoneyAmountError extends AppError {
  constructor(context: Record<string, unknown> = {}) {
    super(
      "Money amount must be represented as valid integer cents.",
      "INVALID_MONEY_AMOUNT",
      context,
    );
    this.name = "InvalidMoneyAmountError";
  }
}
