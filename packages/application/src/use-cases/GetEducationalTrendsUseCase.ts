import {
  AssetType,
  EducationalTrendEngine,
  type EducationalTrendInput,
  type EducationalTrendResult,
} from "@fortuna/domain";
import type {
  Asset,
  AssetClass,
  AssetHistoryPoint,
  MarketDataProvider,
  MarketQuoteDTO,
} from "../ports/MarketDataProvider.js";
import type { WalletRepository } from "../ports/WalletRepository.js";

export const EDUCATIONAL_TRENDS_MAX_SYMBOLS = 5;

export interface GetEducationalTrendsQuery {
  playerId: string;
  symbols: string[];
}

export class GetEducationalTrendsUseCase {
  private readonly engine = new EducationalTrendEngine();

  constructor(
    private readonly marketData: MarketDataProvider,
    private readonly wallets: WalletRepository,
  ) {}

  async execute(
    query: GetEducationalTrendsQuery,
  ): Promise<EducationalTrendResult[]> {
    const symbols = normalizeSymbols(query.symbols);
    if (symbols.length > EDUCATIONAL_TRENDS_MAX_SYMBOLS) {
      throw new Error(
        `At most ${EDUCATIONAL_TRENDS_MAX_SYMBOLS} symbols are accepted.`,
      );
    }

    const wallet = await this.wallets.findByPlayerId(query.playerId);
    const walletSymbols = wallet?.positions.map((position) => position.asset.symbol.value) ?? [];
    const quoteSymbols = normalizeSymbols([...symbols, ...walletSymbols]);
    const quoteOutput = await this.marketData.getQuotes({ symbols: quoteSymbols });
    const quotesBySymbol = new Map(
      quoteOutput.quotes.map((quote) => [quote.symbol, quote]),
    );
    const assetsBySymbol = await this.loadAssets(symbols);

    return Promise.all(
      symbols.map(async (symbol) => {
        const asset = assetsBySymbol.get(symbol);
        const quote = quotesBySymbol.get(symbol);
        const history = await this.loadHistory(symbol);
        const input = this.toInput({
          symbol,
          asset,
          quote,
          history,
          delayed:
            quoteOutput.trace.isCached ||
            quoteOutput.trace.isFallback ||
            quote?.trace.isCached === true ||
            quote?.trace.isFallback === true,
          wallet,
          quotesBySymbol,
        });
        return this.engine.evaluate(input);
      }),
    );
  }

  private async loadAssets(symbols: string[]): Promise<Map<string, Asset>> {
    const entries = await Promise.all(
      symbols.map(async (symbol) => [symbol, await this.marketData.getAsset(symbol)] as const),
    );
    return new Map(
      entries
        .filter((entry): entry is readonly [string, Asset] => entry[1] !== undefined)
        .map(([symbol, asset]) => [symbol, asset]),
    );
  }

  private async loadHistory(symbol: string): Promise<AssetHistoryPoint[]> {
    try {
      const output = await this.marketData.getHistoricalPrices({
        symbol,
        range: "1mo",
        interval: "1d",
      });
      return output.prices;
    } catch {
      return [];
    }
  }

  private toInput(params: {
    symbol: string;
    asset?: Asset;
    quote?: MarketQuoteDTO;
    history: AssetHistoryPoint[];
    delayed: boolean;
    wallet: Awaited<ReturnType<WalletRepository["findByPlayerId"]>>;
    quotesBySymbol: Map<string, MarketQuoteDTO>;
  }): EducationalTrendInput {
    const portfolioContext = this.portfolioContext(
      params.symbol,
      params.asset?.assetClass,
      params.wallet,
      params.quotesBySymbol,
    );
    const closes = params.history.map((point) => ({
      date: point.date.toISOString(),
      closeCents: point.closePriceCents,
      volume: point.volume,
    }));
    const averageVolume20d = averageOptional(
      params.history
        .slice(-20)
        .map((point) => point.volume)
        .filter((volume): volume is number => volume !== undefined && volume > 0),
    );

    return {
      symbol: params.symbol,
      assetType: mapAssetClass(params.asset?.assetClass),
      currentPriceCents: params.quote?.priceCents,
      historicalClosesCents: closes,
      changePercent1d:
        params.quote?.variationBps === undefined
          ? undefined
          : params.quote.variationBps / 100,
      volume: params.history.at(-1)?.volume,
      averageVolume20d,
      portfolioContext,
      dataAsOf:
        params.quote?.marketTimestamp.toISOString() ?? new Date().toISOString(),
      delayed: params.delayed,
    };
  }

  private portfolioContext(
    symbol: string,
    assetClass: AssetClass | undefined,
    wallet: Awaited<ReturnType<WalletRepository["findByPlayerId"]>>,
    quotesBySymbol: Map<string, MarketQuoteDTO>,
  ): EducationalTrendInput["portfolioContext"] {
    if (!wallet) {
      return undefined;
    }
    const values = wallet.positions.map((position) => {
      const positionSymbol = position.asset.symbol.value;
      const priceCents =
        quotesBySymbol.get(positionSymbol)?.priceCents ??
        position.averagePriceCents.cents;
      return {
        symbol: positionSymbol,
        assetClass: position.asset.type,
        valueCents: priceCents * position.totalQuantity.units,
      };
    });
    const total = values.reduce((sum, item) => sum + item.valueCents, 0);
    const assetValue =
      values.find((item) => item.symbol === symbol)?.valueCents ?? 0;
    const targetAssetType = assetClass ? mapAssetClass(assetClass) : undefined;
    const sectorValue = values
      .filter((item) => item.assetClass === targetAssetType)
      .reduce((sum, item) => sum + item.valueCents, 0);

    return {
      inPortfolio: assetValue > 0,
      allocationPercent: total <= 0 ? 0 : (assetValue * 100) / total,
      sectorAllocationPercent: total <= 0 ? 0 : (sectorValue * 100) / total,
    };
  }
}

function normalizeSymbols(symbols: string[]): string[] {
  return [
    ...new Set(
      symbols
        .flatMap((symbol) => symbol.split(","))
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
}

function mapAssetClass(assetClass: AssetClass | undefined): AssetType {
  switch (assetClass) {
    case "CASH":
      return AssetType.CASH;
    case "FIXED_INCOME":
      return AssetType.FIXED_INCOME;
    case "FII":
      return AssetType.FII;
    case "STOCK":
    default:
      return AssetType.STOCK;
  }
}

function averageOptional(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }
  return Math.trunc(values.reduce((sum, value) => sum + value, 0) / values.length);
}
