import type { LoggerPort, MarketDataProvider } from "@fortuna/application";
import {
  CachedMarketDataProvider,
  ExternalMarketDataProvider,
  ExternalMarketDataProviderNotConfiguredError,
  FallbackMarketDataProvider,
} from "./FutureMarketDataProviders.js";
import { BrapiMarketDataProvider } from "./BrapiMarketDataProvider.js";
import { MockMarketDataProvider } from "./MockMarketDataProvider.js";

export type MarketDataProviderSelection =
  | "mock"
  | "external"
  | "fallback"
  | "brapi";

export interface MarketDataProviderConfig {
  provider?: string;
  cacheEnabled?: boolean;
  cacheTtlSeconds?: number;
  externalEnabled?: boolean;
  brapiBaseUrl?: string;
  brapiToken?: string;
  brapiTimeoutMs?: number;
  brapiEnableUnauthenticatedTestQuotes?: boolean;
}

export function readMarketDataProviderConfig(
  env: NodeJS.ProcessEnv = process.env,
): MarketDataProviderConfig {
  return {
    provider: env.MARKET_DATA_PROVIDER ?? "mock",
    cacheEnabled: env.MARKET_DATA_CACHE_ENABLED !== "false",
    cacheTtlSeconds: parseInteger(env.MARKET_DATA_CACHE_TTL_SECONDS, 60),
    externalEnabled: env.EXTERNAL_MARKET_DATA_ENABLED === "true",
    brapiBaseUrl: env.BRAPI_BASE_URL ?? "https://brapi.dev/api",
    brapiToken: env.BRAPI_TOKEN,
    brapiTimeoutMs: parseInteger(env.BRAPI_TIMEOUT_MS, 5000),
    brapiEnableUnauthenticatedTestQuotes:
      env.BRAPI_ENABLE_UNAUTHENTICATED_TEST_QUOTES !== "false",
  };
}

export function createMarketDataProvider(
  config: MarketDataProviderConfig = readMarketDataProviderConfig(),
  logger?: LoggerPort,
): MarketDataProvider {
  const providerName = (config.provider ?? "mock").toLowerCase();
  const mock = new MockMarketDataProvider({ logger });
  const provider = createBaseProvider(providerName, mock, config, logger);

  if (config.cacheEnabled === false) {
    return provider;
  }

  return new CachedMarketDataProvider(provider, {
    ttlSeconds: config.cacheTtlSeconds ?? 60,
    enabled: true,
  });
}

function createBaseProvider(
  providerName: string,
  mock: MockMarketDataProvider,
  config: MarketDataProviderConfig,
  logger?: LoggerPort,
): MarketDataProvider {
  if (providerName === "mock") {
    return mock;
  }

  if (providerName === "external") {
    if (config.externalEnabled !== true) {
      throw new ExternalMarketDataProviderNotConfiguredError();
    }
    return new ExternalMarketDataProvider();
  }

  if (providerName === "brapi") {
    logger?.info("Real market data provider selected", {
      module: "market_data",
      action: "MARKET_DATA_REAL_PROVIDER_SELECTED",
      context: {
        provider: "brapi",
        hasToken: Boolean(config.brapiToken),
        unauthenticatedTestQuotes:
          config.brapiEnableUnauthenticatedTestQuotes !== false,
      },
    });
    const brapi = new BrapiMarketDataProvider({
      baseUrl: config.brapiBaseUrl,
      token: config.brapiToken,
      timeoutMs: config.brapiTimeoutMs,
      enableUnauthenticatedTestQuotes:
        config.brapiEnableUnauthenticatedTestQuotes,
      logger,
    });
    return new FallbackMarketDataProvider(brapi, mock, logger);
  }

  if (providerName === "fallback") {
    const external = new ExternalMarketDataProvider();
    return new FallbackMarketDataProvider(external, mock, logger);
  }

  throw new Error(
    `Unsupported MARKET_DATA_PROVIDER "${providerName}". Expected mock, brapi, external or fallback.`,
  );
}

function parseInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback;
}
