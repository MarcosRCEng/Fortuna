import type { LoggerPort, MarketDataProvider } from "@fortuna/application";
import {
  CachedMarketDataProvider,
  FallbackMarketDataProvider,
} from "./FutureMarketDataProviders.js";
import { BrapiMarketDataProvider } from "./BrapiMarketDataProvider.js";
import { MockMarketDataProvider } from "./MockMarketDataProvider.js";
import {
  readMarketDataConfig,
  validateMarketDataConfig,
  type MarketDataConfig,
  type MarketDataConfigLoadResult,
} from "../config/MarketDataConfig.js";

export type MarketDataProviderSelection = "mock" | "brapi";

export type MarketDataProviderConfig = MarketDataConfig;

export function readMarketDataProviderConfig(
  env: NodeJS.ProcessEnv = process.env,
): MarketDataProviderConfig {
  return readMarketDataConfig(env).config;
}

export function createMarketDataProvider(
  config: MarketDataProviderConfig | MarketDataConfigLoadResult = readMarketDataConfig(),
  logger?: LoggerPort,
): MarketDataProvider {
  const loadResult = isConfigLoadResult(config)
    ? config
    : {
        config,
        requestedProvider: config.provider,
        errors: validateMarketDataConfig(config),
        warnings: [],
      };
  const providerName = loadResult.config.provider;
  const mock = new MockMarketDataProvider({ logger });

  if (loadResult.errors.length > 0) {
    logger?.warn("Invalid BRAPI config, falling back to mock", {
      module: "market_data",
      action: "market_data_invalid_config_fallback",
      context: {
        provider: loadResult.requestedProvider,
        issues: loadResult.errors,
      },
    });
    return mock;
  }

  return createBaseProvider(providerName, mock, loadResult.config, logger);
}

function createBaseProvider(
  providerName: MarketDataProviderSelection,
  mock: MockMarketDataProvider,
  config: MarketDataProviderConfig,
  logger?: LoggerPort,
): MarketDataProvider {
  if (providerName === "mock") {
    logger?.info("Using market data provider: mock", {
      module: "market_data",
      action: "market_data_provider_selected",
      context: { provider: "mock" },
    });
    return mock;
  }

  if (providerName === "brapi") {
    if (!config.allowRealData) {
      logger?.warn("Real market data disabled, falling back to mock", {
        module: "market_data",
        action: "market_data_real_data_disabled_fallback",
        context: { provider: "brapi" },
      });
      return mock;
    }

    if (!config.brapi.apiToken) {
      logger?.warn("BRAPI token missing, falling back to mock", {
        module: "market_data",
        action: "market_data_missing_token_fallback",
        context: { provider: "brapi" },
      });
      return mock;
    }

    logger?.info("Real market data provider selected", {
      module: "market_data",
      action: "MARKET_DATA_REAL_PROVIDER_SELECTED",
      context: {
        provider: "brapi",
        hasToken: true,
        allowRealData: true,
      },
    });
    const brapi = new BrapiMarketDataProvider({
      baseUrl: config.brapi.baseUrl,
      token: config.brapi.apiToken,
      timeoutMs: config.brapi.timeoutMs,
      maxSymbolsPerRequest: config.brapi.maxSymbolsPerRequest,
      enableUnauthenticatedTestQuotes: false,
      logger,
    });
    const cached = new CachedMarketDataProvider(brapi, {
      ttlSeconds: config.brapi.cacheTtlSeconds,
      enabled: true,
    });
    return new FallbackMarketDataProvider(cached, mock, logger);
  }

  return mock;
}

function isConfigLoadResult(
  config: MarketDataProviderConfig | MarketDataConfigLoadResult,
): config is MarketDataConfigLoadResult {
  return "config" in config && "errors" in config;
}
