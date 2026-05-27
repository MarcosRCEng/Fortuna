import {
  AssetClass,
  type Asset,
  type AssetHistoryPoint,
  type AssetPrice,
  EDUCATIONAL_MARKET_DATA_DISCLAIMER,
  type EducationalAssetInfo,
  type ExpectedYield,
  type GetHistoricalPricesInput,
  type GetHistoricalPricesOutput,
  type GetQuotesInput,
  type GetQuotesOutput,
  type LoggerPort,
  LiquidityLevel,
  type MarketDataError,
  MarketDataErrorCode,
  type MarketDataProvider,
  MarketDataProviderType,
  MarketDataSource,
  type MarketDataTrace,
  type MarketProviderStatus,
  MarketRiskLevel,
  MarketSessionStatus,
  type MarketQuote,
  PriceStatus,
  type PriceHistoryOptions,
  type PriceHistoryRequest,
  type RefreshMarketPricesRequest,
  YieldPeriodicity,
  YieldType,
} from "@fortuna/application";
import { Money } from "@fortuna/domain";

type FetchLike = (
  input: string | URL,
  init?: {
    headers?: Record<string, string>;
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
}>;

interface BrapiQuoteResponse {
  results?: BrapiQuote[];
}

interface BrapiQuote {
  symbol?: string;
  shortName?: string;
  longName?: string;
  currency?: string;
  regularMarketPrice?: number;
  regularMarketPreviousClose?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: string;
  historicalDataPrice?: BrapiHistoricalPoint[];
}

interface BrapiHistoricalPoint {
  date?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

export interface BrapiMarketDataProviderOptions {
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  maxSymbolsPerRequest?: number;
  enableUnauthenticatedTestQuotes?: boolean;
  fetch?: FetchLike;
  logger?: LoggerPort;
  clock?: () => Date;
}

const PUBLIC_TEST_TICKERS = new Set(["PETR4", "MGLU3", "VALE3", "ITUB4"]);

export class BrapiMarketDataProvider implements MarketDataProvider {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly timeoutMs: number;
  private readonly maxSymbolsPerRequest?: number;
  private readonly enableUnauthenticatedTestQuotes: boolean;
  private readonly fetchImpl: FetchLike;
  private readonly logger?: LoggerPort;
  private readonly clock: () => Date;

  constructor(options: BrapiMarketDataProviderOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "https://brapi.dev/api").replace(
      /\/+$/,
      "",
    );
    this.token = options.token?.trim() || undefined;
    this.timeoutMs = Math.max(1, options.timeoutMs ?? 5000);
    this.maxSymbolsPerRequest = options.maxSymbolsPerRequest;
    this.enableUnauthenticatedTestQuotes =
      options.enableUnauthenticatedTestQuotes ?? true;
    this.fetchImpl = options.fetch ?? fetch;
    this.logger = options.logger;
    this.clock = options.clock ?? (() => new Date());
  }

  getProviderName(): string {
    return "BrapiMarketDataProvider";
  }

  getProviderType(): MarketDataProviderType {
    return MarketDataProviderType.EXTERNAL;
  }

  async getQuotes(input: GetQuotesInput): Promise<GetQuotesOutput> {
    const symbols = this.normalizeSymbols(input.symbols);
    const trace = this.trace();

    if (symbols.length === 0) {
      return {
        quotes: [],
        errors: [this.error(MarketDataErrorCode.EMPTY_RESPONSE, "No tickers were provided.")],
        trace,
      };
    }

    if (
      this.maxSymbolsPerRequest !== undefined &&
      symbols.length > this.maxSymbolsPerRequest
    ) {
      return {
        quotes: [],
        errors: [
          this.error(
            MarketDataErrorCode.INVALID_RESPONSE,
            `brapi request exceeds the configured maximum of ${this.maxSymbolsPerRequest} symbol(s).`,
          ),
        ],
        trace,
      };
    }

    const authError = this.validateAuthentication(symbols, input.requireToken);
    if (authError) {
      return { quotes: [], errors: [authError], trace };
    }

    try {
      const payload = await this.fetchQuotePayload(symbols);
      const results = Array.isArray(payload.results) ? payload.results : [];
      if (results.length === 0) {
        return {
          quotes: [],
          errors: [
            this.error(
              MarketDataErrorCode.EMPTY_RESPONSE,
              "brapi returned an empty quote response.",
            ),
          ],
          trace,
        };
      }

      const quotes = results
        .map((quote) => this.mapQuote(quote, trace))
        .filter((quote) => quote !== undefined);
      const missing = symbols.filter(
        (symbol) => !quotes.some((quote) => quote.symbol === symbol),
      );

      this.logger?.info("Market data quote fetched", {
        module: "market_data",
        action: "MARKET_DATA_QUOTE_FETCHED",
        context: {
          provider: "brapi",
          symbols,
          quoteCount: quotes.length,
          authenticated: Boolean(this.token),
        },
      });

      return {
        quotes,
        errors: missing.map((symbol) =>
          this.error(
            MarketDataErrorCode.ASSET_NOT_FOUND,
            `Ticker ${symbol} was not returned by brapi.`,
            symbol,
          ),
        ),
        trace,
      };
    } catch (error) {
      return {
        quotes: [],
        errors: [this.toMarketDataError(error)],
        trace,
      };
    }
  }

  async getHistoricalPrices(
    input: GetHistoricalPricesInput,
  ): Promise<GetHistoricalPricesOutput> {
    const output = await this.getQuotes({
      symbols: [input.symbol],
      requireToken: input.requireToken,
    });

    if (output.errors.length > 0 && output.quotes.length === 0) {
      return {
        symbol: input.symbol.trim().toUpperCase(),
        prices: [],
        errors: output.errors,
        trace: output.trace,
      };
    }

    try {
      const payload = await this.fetchQuotePayload([input.symbol], {
        range: input.range ?? this.inferRange(input.from, input.to),
        interval: input.interval ?? "1d",
      });
      const quote = payload.results?.[0];
      const prices = (quote?.historicalDataPrice ?? [])
        .map((point) => this.mapHistoricalPoint(input.symbol, point))
        .filter((point) => point !== undefined);

      return {
        symbol: input.symbol.trim().toUpperCase(),
        prices,
        errors:
          prices.length === 0
            ? [
                this.error(
                  MarketDataErrorCode.EMPTY_RESPONSE,
                  "brapi returned no historical OHLCV points.",
                  input.symbol,
                ),
              ]
            : [],
        trace: output.trace,
      };
    } catch (error) {
      return {
        symbol: input.symbol.trim().toUpperCase(),
        prices: [],
        errors: [this.toMarketDataError(error)],
        trace: output.trace,
      };
    }
  }

  async listAssets(): Promise<Asset[]> {
    const output = await this.getQuotes({ symbols: [...PUBLIC_TEST_TICKERS] });
    return output.quotes.map((quote) => this.quoteToAsset(quote));
  }

  async getAssetById(assetId: string): Promise<Asset | null> {
    return (await this.getAsset(assetId)) ?? null;
  }

  async getAsset(symbol: string): Promise<Asset | undefined> {
    const output = await this.getQuotes({ symbols: [symbol] });
    return output.quotes[0] ? this.quoteToAsset(output.quotes[0]) : undefined;
  }

  async getCurrentPrice(symbol: string): Promise<AssetPrice | undefined> {
    const output = await this.getQuotes({ symbols: [symbol] });
    const quote = output.quotes[0];
    if (!quote) {
      return undefined;
    }
    return {
      assetId: quote.symbol,
      symbol: quote.symbol,
      priceCents: quote.priceCents,
      previousPriceCents: quote.previousPriceCents,
      variationBps: quote.variationBps,
      priceStatus: quote.priceStatus,
      dataSource: quote.dataSource,
      marketTimestamp: quote.marketTimestamp,
      updatedAt: quote.updatedAt,
    };
  }

  async getQuote(symbol: string): Promise<MarketQuote> {
    const price = await this.getCurrentPrice(symbol);
    if (!price) {
      throw new Error(`Market asset ${symbol} is not available from brapi.`);
    }
    return {
      symbol: price.symbol,
      price: Money.fromCents(price.priceCents),
      asOf: price.marketTimestamp,
      provider: price.dataSource,
      priceStatus: price.priceStatus,
    };
  }

  async getPriceHistory(
    requestOrAssetId: PriceHistoryRequest | string,
    options?: PriceHistoryOptions,
  ): Promise<AssetHistoryPoint[]> {
    const input =
      typeof requestOrAssetId === "string"
        ? {
            symbol: requestOrAssetId,
            from: options?.from,
            to: options?.to,
          }
        : {
            symbol: requestOrAssetId.symbol,
            from: requestOrAssetId.from,
            to: requestOrAssetId.to,
          };
    return (await this.getHistoricalPrices(input)).prices;
  }

  async getYieldInfo(_assetId: string): Promise<ExpectedYield | null> {
    return null;
  }

  async getExpectedYield(_symbol: string): Promise<ExpectedYield | undefined> {
    return undefined;
  }

  async getEducationalInfo(
    symbol: string,
  ): Promise<EducationalAssetInfo | undefined> {
    const normalized = symbol.trim().toUpperCase();
    return {
      symbol: normalized,
      shortDescription: `Ativo real ${normalized} consultado via brapi para uso educativo.`,
      longDescription: EDUCATIONAL_MARKET_DATA_DISCLAIMER,
      riskExplanation:
        "Ativos reais de mercado podem oscilar e os dados podem ter atraso.",
      liquidityExplanation:
        "Liquidez real depende do mercado; no MVP a carteira permanece simulada.",
      beginnerTip:
        "Use a cotacao como informacao educativa, nao como recomendacao.",
      mentorHint:
        "Dados reais ajudam a observar o mercado, mas a decisao no jogo continua simulada.",
    };
  }

  async refreshPrices(_request?: RefreshMarketPricesRequest): Promise<Asset[]> {
    return this.listAssets();
  }

  async getProviderStatus(): Promise<MarketProviderStatus> {
    return {
      sessionStatus: MarketSessionStatus.OPEN,
      dataSource: MarketDataSource.BRAPI,
      priceStatus: PriceStatus.UPDATED,
      checkedAt: this.clock(),
      message: EDUCATIONAL_MARKET_DATA_DISCLAIMER,
    };
  }

  buildQuoteUrl(
    symbols: string[],
    params: Record<string, string | undefined> = {},
  ): URL {
    const path = `${this.baseUrl}/quote/${this.normalizeSymbols(symbols).join(",")}`;
    const url = new URL(path);
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }
    return url;
  }

  private async fetchQuotePayload(
    symbols: string[],
    params: Record<string, string | undefined> = {},
  ): Promise<BrapiQuoteResponse> {
    const url = this.buildQuoteUrl(symbols, params);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(url, {
        headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new BrapiHttpError(response.status, response.statusText);
      }

      return response.json() as Promise<BrapiQuoteResponse>;
    } catch (error) {
      if (isAbortError(error)) {
        throw new BrapiTimeoutError();
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private validateAuthentication(
    symbols: string[],
    requireToken = false,
  ): MarketDataError | undefined {
    if (this.token) {
      return undefined;
    }
    const canUsePublicTests =
      this.enableUnauthenticatedTestQuotes &&
      symbols.every((symbol) => PUBLIC_TEST_TICKERS.has(symbol));

    if (!requireToken && canUsePublicTests) {
      return undefined;
    }

    return this.error(
      MarketDataErrorCode.MISSING_TOKEN,
      "BRAPI_API_TOKEN is required for this brapi request.",
    );
  }

  private mapQuote(
    quote: BrapiQuote,
    trace: MarketDataTrace,
  ): GetQuotesOutput["quotes"][number] | undefined {
    if (!quote.symbol || quote.regularMarketPrice === undefined) {
      return undefined;
    }
    const priceCents = this.toCents(quote.regularMarketPrice);
    const previousPriceCents =
      quote.regularMarketPreviousClose === undefined
        ? undefined
        : this.toCents(quote.regularMarketPreviousClose);

    return {
      symbol: quote.symbol.trim().toUpperCase(),
      name: quote.longName ?? quote.shortName,
      priceCents,
      previousPriceCents,
      variationBps:
        quote.regularMarketChangePercent === undefined
          ? this.calculateVariationBps(priceCents, previousPriceCents)
          : Math.round(quote.regularMarketChangePercent * 100),
      currency: quote.currency ?? "BRL",
      marketTimestamp: quote.regularMarketTime
        ? new Date(quote.regularMarketTime)
        : this.clock(),
      updatedAt: this.clock(),
      priceStatus: PriceStatus.UPDATED,
      dataSource: MarketDataSource.BRAPI,
      trace,
    };
  }

  private mapHistoricalPoint(
    symbol: string,
    point: BrapiHistoricalPoint,
  ): AssetHistoryPoint | undefined {
    if (
      point.date === undefined ||
      point.open === undefined ||
      point.high === undefined ||
      point.low === undefined ||
      point.close === undefined
    ) {
      return undefined;
    }

    return {
      symbol: symbol.trim().toUpperCase(),
      date: new Date(point.date * 1000),
      openPriceCents: this.toCents(point.open),
      closePriceCents: this.toCents(point.close),
      minPriceCents: this.toCents(point.low),
      maxPriceCents: this.toCents(point.high),
      volume: point.volume,
    };
  }

  private quoteToAsset(quote: GetQuotesOutput["quotes"][number]): Asset {
    return {
      id: quote.symbol,
      symbol: quote.symbol,
      name: quote.name ?? quote.symbol,
      assetClass: AssetClass.STOCK,
      currentPriceCents: quote.priceCents,
      previousPriceCents: quote.previousPriceCents,
      variationBps: quote.variationBps,
      riskLevel: MarketRiskLevel.HIGH,
      liquidity: LiquidityLevel.HIGH,
      expectedYield: {
        symbol: quote.symbol,
        yieldType: YieldType.NONE,
        periodicity: YieldPeriodicity.NONE,
        amountPerUnitCents: 0,
        rateBps: 0,
        description: "Dividendos e proventos reais nao sao aplicados no MVP.",
      },
      educationalDescription: EDUCATIONAL_MARKET_DATA_DISCLAIMER,
      yieldRules: "Sem aplicacao automatica de proventos reais no MVP.",
      isMocked: false,
      priceStatus: quote.priceStatus,
      dataSource: quote.dataSource,
      updatedAt: quote.updatedAt,
    };
  }

  private normalizeSymbols(symbols: string[]): string[] {
    return [
      ...new Set(
        symbols
          .map((symbol) => symbol.trim().toUpperCase())
          .filter((symbol) => symbol.length > 0),
      ),
    ];
  }

  private trace(): MarketDataTrace {
    return {
      source: "brapi",
      providerName: this.getProviderName(),
      isRealData: true,
      isCached: false,
      isFallback: false,
      fetchedAt: this.clock(),
      disclaimer: EDUCATIONAL_MARKET_DATA_DISCLAIMER,
    };
  }

  private error(
    code: MarketDataErrorCode,
    message: string,
    symbol?: string,
    statusCode?: number,
  ): MarketDataError {
    return {
      code,
      message,
      symbol,
      statusCode,
      providerName: this.getProviderName(),
    };
  }

  private toMarketDataError(error: unknown): MarketDataError {
    if (error instanceof BrapiHttpError) {
      return this.error(
        error.status === 429
          ? MarketDataErrorCode.RATE_LIMITED
          : MarketDataErrorCode.HTTP_ERROR,
        `brapi request failed with HTTP ${error.status}.`,
        undefined,
        error.status,
      );
    }
    if (error instanceof BrapiTimeoutError) {
      return this.error(
        MarketDataErrorCode.TIMEOUT,
        `brapi request timed out after ${this.timeoutMs}ms.`,
      );
    }
    return this.error(
      MarketDataErrorCode.PROVIDER_UNAVAILABLE,
      error instanceof Error ? error.message : "brapi provider failed.",
    );
  }

  private toCents(value: number): number {
    return Math.max(1, Math.round(value * 100));
  }

  private calculateVariationBps(
    currentCents: number,
    previousCents: number | undefined,
  ): number {
    if (!previousCents || previousCents <= 0) {
      return 0;
    }
    return Math.trunc(((currentCents - previousCents) * 10_000) / previousCents);
  }

  private inferRange(from?: Date, to?: Date): string {
    if (!from || !to) {
      return "1mo";
    }
    const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));
    if (days <= 5) {
      return "5d";
    }
    if (days <= 30) {
      return "1mo";
    }
    if (days <= 90) {
      return "3mo";
    }
    if (days <= 180) {
      return "6mo";
    }
    return "1y";
  }
}

class BrapiHttpError extends Error {
  constructor(
    readonly status: number,
    readonly statusText: string,
  ) {
    super(`brapi HTTP ${status}: ${statusText}`);
    this.name = "BrapiHttpError";
  }
}

class BrapiTimeoutError extends Error {
  constructor() {
    super("brapi request timed out.");
    this.name = "BrapiTimeoutError";
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
