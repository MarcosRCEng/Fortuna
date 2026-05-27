export type MarketDataProviderType = "mock" | "brapi";

export interface BrapiConfig {
  baseUrl: string;
  apiToken?: string;
  timeoutMs: number;
  cacheTtlSeconds: number;
  maxSymbolsPerRequest: number;
}

export interface MarketDataConfig {
  provider: MarketDataProviderType;
  allowRealData: boolean;
  brapi: BrapiConfig;
}

export interface MarketDataConfigLoadResult {
  config: MarketDataConfig;
  requestedProvider: string;
  errors: string[];
  warnings: string[];
}

const DEFAULT_MARKET_DATA_CONFIG: MarketDataConfig = {
  provider: "mock",
  allowRealData: false,
  brapi: {
    baseUrl: "https://brapi.dev/api",
    timeoutMs: 5000,
    cacheTtlSeconds: 900,
    maxSymbolsPerRequest: 1,
  },
};

const ALLOWED_PROVIDERS: MarketDataProviderType[] = ["mock", "brapi"];

export function readMarketDataConfig(
  env: NodeJS.ProcessEnv = process.env,
): MarketDataConfigLoadResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const requestedProvider = (env.MARKET_DATA_PROVIDER ?? "mock")
    .trim()
    .toLowerCase();
  const provider = parseProvider(requestedProvider, errors);
  const allowRealData = parseBoolean(env.MARKET_DATA_ALLOW_REAL_DATA, false);
  const baseUrl = parseUrl(
    env.BRAPI_BASE_URL,
    DEFAULT_MARKET_DATA_CONFIG.brapi.baseUrl,
    "BRAPI_BASE_URL",
    errors,
  );
  const timeoutMs = parsePositiveInteger(
    env.BRAPI_TIMEOUT_MS,
    DEFAULT_MARKET_DATA_CONFIG.brapi.timeoutMs,
    "BRAPI_TIMEOUT_MS",
    errors,
  );
  const cacheTtlSeconds = parsePositiveInteger(
    env.BRAPI_CACHE_TTL_SECONDS,
    DEFAULT_MARKET_DATA_CONFIG.brapi.cacheTtlSeconds,
    "BRAPI_CACHE_TTL_SECONDS",
    errors,
  );
  const maxSymbolsPerRequest = parsePositiveInteger(
    env.BRAPI_MAX_SYMBOLS_PER_REQUEST,
    DEFAULT_MARKET_DATA_CONFIG.brapi.maxSymbolsPerRequest,
    "BRAPI_MAX_SYMBOLS_PER_REQUEST",
    errors,
  );
  const apiToken = env.BRAPI_API_TOKEN?.trim() || undefined;

  if (provider === "brapi" && !allowRealData) {
    warnings.push("Real market data is disabled.");
  }

  if (provider === "brapi" && allowRealData && !apiToken) {
    warnings.push("BRAPI API token is missing.");
  }

  return {
    config: {
      provider,
      allowRealData,
      brapi: {
        baseUrl,
        apiToken,
        timeoutMs,
        cacheTtlSeconds,
        maxSymbolsPerRequest,
      },
    },
    requestedProvider,
    errors,
    warnings,
  };
}

export function validateMarketDataConfig(config: MarketDataConfig): string[] {
  const errors: string[] = [];

  if (!ALLOWED_PROVIDERS.includes(config.provider)) {
    errors.push("MARKET_DATA_PROVIDER must be mock or brapi.");
  }

  try {
    new URL(config.brapi.baseUrl);
  } catch {
    errors.push("BRAPI_BASE_URL must be a valid URL.");
  }

  validatePositiveInteger(config.brapi.timeoutMs, "BRAPI_TIMEOUT_MS", errors);
  validatePositiveInteger(
    config.brapi.cacheTtlSeconds,
    "BRAPI_CACHE_TTL_SECONDS",
    errors,
  );
  validatePositiveInteger(
    config.brapi.maxSymbolsPerRequest,
    "BRAPI_MAX_SYMBOLS_PER_REQUEST",
    errors,
  );

  return errors;
}

function parseProvider(value: string, errors: string[]): MarketDataProviderType {
  if (ALLOWED_PROVIDERS.includes(value as MarketDataProviderType)) {
    return value as MarketDataProviderType;
  }

  errors.push("MARKET_DATA_PROVIDER must be mock or brapi.");
  return "mock";
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }

  return fallback;
}

function parseUrl(
  value: string | undefined,
  fallback: string,
  name: string,
  errors: string[],
): string {
  const candidate = value?.trim() || fallback;
  try {
    new URL(candidate);
    return candidate;
  } catch {
    errors.push(`${name} must be a valid URL.`);
    return fallback;
  }
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
  name: string,
  errors: string[],
): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  if (Number.isSafeInteger(parsed) && parsed > 0) {
    return parsed;
  }

  errors.push(`${name} must be a positive integer.`);
  return fallback;
}

function validatePositiveInteger(
  value: number,
  name: string,
  errors: string[],
): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    errors.push(`${name} must be a positive integer.`);
  }
}
