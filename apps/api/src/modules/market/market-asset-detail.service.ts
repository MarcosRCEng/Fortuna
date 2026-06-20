import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  MarketCatalogItem,
  MarketProviderCapabilities,
  MarketQuote,
} from "@fortuna/domain";
import {
  MarketValidationError,
  MvpMarketDataService,
  PinoLogger,
  readMarketDataConfig,
} from "@fortuna/infrastructure";
import type { EducationalTrendResponseDto } from "../player/player.dto.js";
import { PlayerApiService } from "../player/player-api.service.js";
import { WatchlistApiService } from "../watchlist/watchlist-api.service.js";

export type MarketAssetDetailDataState = "REAL" | "MOCK" | "CACHE" | "FALLBACK";

export interface MarketAssetDetailResponse {
  asset: {
    symbol: string;
    name: string;
    type: MarketCatalogItem["type"];
    group: MarketCatalogItem["group"];
    sector?: string;
    currency: "BRL";
    tradableInFortuna: boolean;
    logoUrl?: string;
  };
  quote: {
    priceCents?: number;
    changePercent?: number;
    previousCloseCents?: number;
    dataAsOf: string | null;
  };
  provenance: {
    source: "BRAPI" | "MOCK" | "CACHE" | "FALLBACK";
    provider: "brapi" | "mock" | "cache" | "fallback";
    dataState: MarketAssetDetailDataState;
    fetchedAt: string;
    dataAsOf: string | null;
    isRealData: boolean;
    isCached: boolean;
    isFallback: boolean;
    isDelayed: boolean;
  };
  position: {
    inPortfolio: boolean;
    quantity: number;
    averagePriceCents: number;
    investedValueCents: number;
    currentValueCents: number;
    unrealizedResultCents: number;
  };
  allocation: {
    assetBasisPoints: number;
    assetPercentageFormatted: string;
    classBasisPoints: number;
    classPercentageFormatted: string;
  };
  watchlist: {
    inWatchlist: boolean;
  };
  capabilities: MarketProviderCapabilities & {
    canTradeInFortuna: boolean;
    canShowEducationalTrend: boolean;
  };
  trend: EducationalTrendResponseDto | null;
  trendError?: {
    code: "TREND_UNAVAILABLE";
    message: string;
  };
}

@Injectable()
export class MarketAssetDetailService {
  private readonly logger = new PinoLogger();
  private readonly marketData = new MvpMarketDataService({
    config: readMarketDataConfig().config,
    logger: this.logger,
  });

  constructor(
    @Inject(PlayerApiService)
    private readonly players: PlayerApiService,
    @Inject(WatchlistApiService)
    private readonly watchlists: WatchlistApiService,
  ) {}

  async getAuthenticatedDetail(
    playerId: string,
    symbol: string,
    options: { includeTrend?: boolean } = {},
  ): Promise<MarketAssetDetailResponse> {
    const normalizedSymbol = this.parseSymbol(symbol);
    const catalog = await this.findCatalogItem(normalizedSymbol);
    const status = this.marketData.getStatus();
    const quote = await this.loadQuote(catalog);
    const provenance = this.buildProvenance({
      catalog,
      quote,
      catalogFetchedAt: catalog.fetchedAt,
      realDataEnabled: status.realDataEnabled,
    });
    const [portfolio, allocation, watchlist] = await Promise.all([
      this.players.getPortfolio(playerId),
      this.players.getPortfolioAllocation(playerId),
      this.watchlists.get(playerId),
    ]);
    const position = portfolio.positions.find(
      (item) => item.symbol === normalizedSymbol,
    );
    const assetAllocation = allocation.byAsset.find(
      (item) => item.symbol === normalizedSymbol,
    );
    const classAllocation = allocation.byAssetType.find(
      (item) => item.assetType === allocationClassForMarketType(catalog.type),
    );
    const trend = await this.loadTrend(playerId, normalizedSymbol, options);

    return {
      asset: {
        symbol: catalog.symbol,
        name: catalog.name,
        type: catalog.type,
        group: catalog.group,
        ...(catalog.sector ? { sector: catalog.sector } : {}),
        currency: catalog.currency,
        tradableInFortuna: catalog.tradableInFortuna,
        ...(catalog.logoUrl ? { logoUrl: catalog.logoUrl } : {}),
      },
      quote: {
        ...(quote.priceCents !== undefined ? { priceCents: quote.priceCents } : {}),
        ...(quote.changePercent !== undefined
          ? { changePercent: quote.changePercent }
          : {}),
        ...(quote.previousCloseCents !== undefined
          ? { previousCloseCents: quote.previousCloseCents }
          : {}),
        dataAsOf: provenance.dataAsOf,
      },
      provenance,
      position: {
        inPortfolio: Boolean(position),
        quantity: position ? Number(position.quantity) : 0,
        averagePriceCents: position?.averagePriceCents ?? 0,
        investedValueCents: position?.investedValueCents ?? 0,
        currentValueCents: position?.marketValueCents ?? 0,
        unrealizedResultCents: position?.unrealizedResultCents ?? 0,
      },
      allocation: {
        assetBasisPoints: assetAllocation?.basisPoints ?? 0,
        assetPercentageFormatted: assetAllocation?.percentageFormatted ?? "0,00%",
        classBasisPoints: classAllocation?.basisPoints ?? 0,
        classPercentageFormatted:
          classAllocation?.percentageFormatted ?? "0,00%",
      },
      watchlist: {
        inWatchlist: watchlist.items.some(
          (item) => item.symbol === normalizedSymbol,
        ),
      },
      capabilities: {
        ...status.capabilities,
        canTradeInFortuna: catalog.tradableInFortuna,
        canShowEducationalTrend: options.includeTrend !== false,
      },
      trend: trend.data,
      ...(trend.error ? { trendError: trend.error } : {}),
    };
  }

  private parseSymbol(symbol: string): string {
    const normalized = symbol.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,12}$/.test(normalized)) {
      throw new BadRequestException("symbol must be a valid market ticker.");
    }
    return normalized;
  }

  private async findCatalogItem(symbol: string): Promise<
    MarketCatalogItem & { fetchedAt: string; source: "BRAPI" | "MOCK" | "CACHE"; delayed: boolean }
  > {
    try {
      const page = await this.marketData.getCatalog({
        search: symbol,
        page: 1,
        pageSize: 10,
      });
      const item = page.items.find((candidate) => candidate.symbol === symbol);
      if (!item) {
        throw new NotFoundException(`Asset ${symbol} was not found in the market catalog.`);
      }
      return {
        ...item,
        fetchedAt: page.fetchedAt,
        source: page.source,
        delayed: page.delayed,
      };
    } catch (error) {
      if (error instanceof MarketValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private async loadQuote(catalog: MarketCatalogItem & {
    source: "BRAPI" | "MOCK" | "CACHE";
    delayed: boolean;
  }): Promise<{
    priceCents?: number;
    changePercent?: number;
    previousCloseCents?: number;
    dataAsOf: string | null;
    provider: "brapi" | "mock" | "cache" | "fallback";
    isRealData: boolean;
    isDelayed: boolean;
  }> {
    if (catalog.tradableInFortuna) {
      try {
        const [quote] = await this.marketData.getQuotes([catalog.symbol]);
        if (quote) {
          return toQuoteSummary(quote);
        }
      } catch (error) {
        if (!(error instanceof MarketValidationError)) {
          throw error;
        }
      }
    }

    return {
      ...(catalog.priceCents !== undefined ? { priceCents: catalog.priceCents } : {}),
      ...(catalog.changePercent !== undefined
        ? { changePercent: catalog.changePercent }
        : {}),
      dataAsOf: null,
      provider: providerForCatalogSource(catalog.source),
      isRealData: catalog.source === "BRAPI",
      isDelayed: catalog.delayed || catalog.source === "CACHE",
    };
  }

  private buildProvenance(params: {
    catalog: MarketCatalogItem & {
      source: "BRAPI" | "MOCK" | "CACHE";
      delayed: boolean;
    };
    quote: Awaited<ReturnType<MarketAssetDetailService["loadQuote"]>>;
    catalogFetchedAt: string;
    realDataEnabled: boolean;
  }): MarketAssetDetailResponse["provenance"] {
    const dataState = dataStateForQuote({
      provider: params.quote.provider,
      isRealData: params.quote.isRealData,
      realDataEnabled: params.realDataEnabled,
    });
    return {
      source: sourceForProvider(params.quote.provider),
      provider: params.quote.provider,
      dataState,
      fetchedAt: params.catalogFetchedAt,
      dataAsOf: params.quote.dataAsOf,
      isRealData: params.quote.isRealData,
      isCached: dataState === "CACHE",
      isFallback: dataState === "FALLBACK",
      isDelayed: params.quote.isDelayed || params.catalog.delayed,
    };
  }

  private async loadTrend(
    playerId: string,
    symbol: string,
    options: { includeTrend?: boolean },
  ): Promise<{
    data: EducationalTrendResponseDto | null;
    error?: MarketAssetDetailResponse["trendError"];
  }> {
    if (options.includeTrend === false) {
      return { data: null };
    }
    try {
      return { data: await this.players.getEducationalTrend(playerId, symbol) };
    } catch {
      return {
        data: null,
        error: {
          code: "TREND_UNAVAILABLE",
          message:
            "Tendencia educativa indisponivel no momento; o restante do detalhe permanece valido.",
        },
      };
    }
  }
}

function toQuoteSummary(quote: MarketQuote): {
  priceCents: number;
  changePercent: number;
  previousCloseCents?: number;
  dataAsOf: string;
  provider: "brapi" | "mock" | "cache" | "fallback";
  isRealData: boolean;
  isDelayed: boolean;
} {
  return {
    priceCents: quote.priceInCents,
    changePercent: quote.regularMarketChangePercent,
    ...(quote.regularMarketPreviousCloseInCents !== undefined
      ? { previousCloseCents: quote.regularMarketPreviousCloseInCents }
      : {}),
    dataAsOf: quote.marketTime,
    provider: quote.provider,
    isRealData: quote.isRealData,
    isDelayed: quote.isDelayed,
  };
}

function providerForCatalogSource(
  source: "BRAPI" | "MOCK" | "CACHE",
): "brapi" | "mock" | "cache" {
  if (source === "BRAPI") {
    return "brapi";
  }
  if (source === "CACHE") {
    return "cache";
  }
  return "mock";
}

function dataStateForQuote(input: {
  provider: "brapi" | "mock" | "cache" | "fallback";
  isRealData: boolean;
  realDataEnabled: boolean;
}): MarketAssetDetailDataState {
  if (input.provider === "cache") {
    return "CACHE";
  }
  if (input.provider === "fallback") {
    return "FALLBACK";
  }
  if (input.isRealData) {
    return "REAL";
  }
  return input.realDataEnabled ? "FALLBACK" : "MOCK";
}

function sourceForProvider(
  provider: "brapi" | "mock" | "cache" | "fallback",
): "BRAPI" | "MOCK" | "CACHE" | "FALLBACK" {
  if (provider === "brapi") {
    return "BRAPI";
  }
  if (provider === "cache") {
    return "CACHE";
  }
  if (provider === "fallback") {
    return "FALLBACK";
  }
  return "MOCK";
}

function allocationClassForMarketType(type: MarketCatalogItem["type"]): string {
  if (type === "FII") {
    return "FII";
  }
  if (type === "TREASURY") {
    return "FIXED_INCOME";
  }
  return "STOCK";
}
