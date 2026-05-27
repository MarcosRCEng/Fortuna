import { describe, expect, it, vi } from "vitest";
import { MarketDataProviderType } from "@fortuna/application";
import {
  createMarketDataProvider,
  readMarketDataConfig,
  validateMarketDataConfig,
} from "../src/index.js";

describe("Market data configuration", () => {
  it("uses mock provider when no env is defined", () => {
    const provider = createMarketDataProvider(
      readMarketDataConfig({}),
      logger(),
    );

    expect(provider.getProviderType()).toBe(MarketDataProviderType.MOCK);
  });

  it("uses mock provider when MARKET_DATA_PROVIDER=mock", () => {
    const provider = createMarketDataProvider(
      readMarketDataConfig({ MARKET_DATA_PROVIDER: "mock" }),
      logger(),
    );

    expect(provider.getProviderType()).toBe(MarketDataProviderType.MOCK);
  });

  it("falls back to mock when brapi is selected but real data is disabled", () => {
    const logs = logger();
    const provider = createMarketDataProvider(
      readMarketDataConfig({
        MARKET_DATA_PROVIDER: "brapi",
        MARKET_DATA_ALLOW_REAL_DATA: "false",
      }),
      logs,
    );

    expect(provider.getProviderType()).toBe(MarketDataProviderType.MOCK);
    expect(logs.warn).toHaveBeenCalledWith(
      "Real market data disabled, falling back to mock",
      expect.any(Object),
    );
  });

  it("falls back to mock when brapi is allowed but token is missing", () => {
    const logs = logger();
    const provider = createMarketDataProvider(
      readMarketDataConfig({
        MARKET_DATA_PROVIDER: "brapi",
        MARKET_DATA_ALLOW_REAL_DATA: "true",
      }),
      logs,
    );

    expect(provider.getProviderType()).toBe(MarketDataProviderType.MOCK);
    expect(logs.warn).toHaveBeenCalledWith(
      "BRAPI token missing, falling back to mock",
      expect.any(Object),
    );
  });

  it("creates the brapi provider path only when brapi is selected, allowed and token is present", () => {
    const provider = createMarketDataProvider(
      readMarketDataConfig({
        MARKET_DATA_PROVIDER: "brapi",
        MARKET_DATA_ALLOW_REAL_DATA: "true",
        BRAPI_API_TOKEN: "local-token",
      }),
      logger(),
    );

    expect(provider.getProviderType()).toBe(MarketDataProviderType.FALLBACK);
    expect(provider.getProviderName()).toContain("BrapiMarketDataProvider");
  });

  it("falls back to mock when BRAPI_TIMEOUT_MS is invalid", () => {
    expectInvalidConfigFallsBack({
      MARKET_DATA_PROVIDER: "brapi",
      MARKET_DATA_ALLOW_REAL_DATA: "true",
      BRAPI_API_TOKEN: "local-token",
      BRAPI_TIMEOUT_MS: "0",
    });
  });

  it("falls back to mock when BRAPI_CACHE_TTL_SECONDS is invalid", () => {
    expectInvalidConfigFallsBack({
      MARKET_DATA_PROVIDER: "brapi",
      MARKET_DATA_ALLOW_REAL_DATA: "true",
      BRAPI_API_TOKEN: "local-token",
      BRAPI_CACHE_TTL_SECONDS: "-1",
    });
  });

  it("falls back to mock when BRAPI_MAX_SYMBOLS_PER_REQUEST is invalid", () => {
    expectInvalidConfigFallsBack({
      MARKET_DATA_PROVIDER: "brapi",
      MARKET_DATA_ALLOW_REAL_DATA: "true",
      BRAPI_API_TOKEN: "local-token",
      BRAPI_MAX_SYMBOLS_PER_REQUEST: "many",
    });
  });

  it("does not include the BRAPI token in logs", () => {
    const logs = logger();
    const token = "super-secret-token";

    createMarketDataProvider(
      readMarketDataConfig({
        MARKET_DATA_PROVIDER: "brapi",
        MARKET_DATA_ALLOW_REAL_DATA: "true",
        BRAPI_API_TOKEN: token,
      }),
      logs,
    );

    expect(JSON.stringify(logs.info.mock.calls)).not.toContain(token);
    expect(JSON.stringify(logs.warn.mock.calls)).not.toContain(token);
    expect(JSON.stringify(logs.error.mock.calls)).not.toContain(token);
  });

  it("enforces the 15 minute minimum cache TTL with an explicit warning", () => {
    const result = readMarketDataConfig({
      BRAPI_CACHE_TTL_SECONDS: "60",
    });

    expect(result.config.brapi.cacheTtlSeconds).toBe(900);
    expect(result.warnings).toContain(
      "BRAPI_CACHE_TTL_SECONDS is below 900; using the 900 second minimum.",
    );
  });

  it("normalizes and deduplicates the real market symbol allowlist", () => {
    const result = readMarketDataConfig({
      MARKET_DATA_ALLOWED_SYMBOLS: " petr4, VALE3,petr4 ",
    });

    expect(result.config.brapi.allowedSymbols).toEqual(["PETR4", "VALE3"]);
  });

  it("allows an empty allowlist so real queries can be blocked by policy", () => {
    const result = readMarketDataConfig({
      MARKET_DATA_ALLOWED_SYMBOLS: "",
    });

    expect(result.config.brapi.allowedSymbols).toEqual([]);
  });

  it("rejects invalid allowlist symbols during validation", () => {
    const result = readMarketDataConfig({
      MARKET_DATA_ALLOWED_SYMBOLS: "PETR4, bad-symbol ",
    });

    expect(result.errors).toContain(
      "MARKET_DATA_ALLOWED_SYMBOLS contains invalid symbols.",
    );
  });

  it("rejects invalid URLs during validation", () => {
    const result = readMarketDataConfig({
      MARKET_DATA_PROVIDER: "brapi",
      MARKET_DATA_ALLOW_REAL_DATA: "true",
      BRAPI_API_TOKEN: "local-token",
      BRAPI_BASE_URL: "not-a-url",
    });

    expect(result.errors).toContain("BRAPI_BASE_URL must be a valid URL.");
    expect(validateMarketDataConfig(result.config)).toEqual([]);
  });
});

function expectInvalidConfigFallsBack(env: NodeJS.ProcessEnv): void {
  const logs = logger();
  const provider = createMarketDataProvider(readMarketDataConfig(env), logs);

  expect(provider.getProviderType()).toBe(MarketDataProviderType.MOCK);
  expect(logs.warn).toHaveBeenCalledWith(
    "Invalid BRAPI config, falling back to mock",
    expect.any(Object),
  );
}

function logger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}
