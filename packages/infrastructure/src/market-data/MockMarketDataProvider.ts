import {
  Asset,
  AssetClass,
  AssetHistoryPoint,
  AssetPrice,
  EDUCATIONAL_MARKET_DATA_DISCLAIMER,
  EducationalAssetInfo,
  ExpectedYield,
  GetHistoricalPricesInput,
  GetHistoricalPricesOutput,
  GetQuotesInput,
  GetQuotesOutput,
  LiquidityLevel,
  MarketDataErrorCode,
  MarketDataProvider,
  MarketDataProviderType,
  MarketDataSource,
  MarketDataTrace,
  MarketProviderStatus,
  MarketRiskLevel,
  MarketSessionStatus,
  PriceHistoryRequest,
  PriceStatus,
  RefreshMarketPricesRequest,
  YieldPeriodicity,
  YieldType,
  type LoggerPort,
  type MarketPriceProvider,
  type MarketQuote,
} from "@fortuna/application";
import {
  Asset as DomainAsset,
  AssetSymbol,
  AssetType,
  MarketPrice,
  Money,
  MoneyCents,
  RiskLevel,
} from "@fortuna/domain";

interface MockAssetDefinition {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  basePriceCents: number;
  riskLevel: MarketRiskLevel;
  liquidity: LiquidityLevel;
  expectedYield: ExpectedYield;
  educationalInfo: EducationalAssetInfo;
  yieldRules: string;
  volatilityBps: number;
  positiveBiasBps: number;
}

export interface MockMarketDataProviderOptions {
  seed?: string;
  clock?: () => Date;
  logger?: LoggerPort;
}

const DEFAULT_SEED = "fortuna-mvp-market-seed";
const DEFAULT_DATE = new Date("2026-05-21T12:00:00.000Z");

const MOCK_ASSETS: MockAssetDefinition[] = [
  {
    id: "asset-cash",
    symbol: "CASH",
    name: "Caixa Fortuna",
    assetClass: AssetClass.CASH,
    basePriceCents: 1,
    riskLevel: MarketRiskLevel.NONE,
    liquidity: LiquidityLevel.IMMEDIATE,
    expectedYield: {
      symbol: "CASH",
      yieldType: YieldType.NONE,
      periodicity: YieldPeriodicity.NONE,
      amountPerUnitCents: 0,
      rateBps: 0,
      description: "Caixa nao possui rendimento no MVP.",
    },
    educationalInfo: {
      symbol: "CASH",
      shortDescription: "Saldo livre do jogador.",
      longDescription:
        "Representa moedas Fortuna disponiveis para comprar ativos ou receber rendimentos.",
      riskExplanation: "Nao ha risco de mercado no caixa do MVP.",
      liquidityExplanation:
        "Liquidez imediata: pode ser usado a qualquer momento.",
      beginnerTip:
        "Mantenha caixa para aproveitar oportunidades sem vender ativos.",
      mentorHint:
        "Caixa traz flexibilidade, mas nao faz a cidade crescer sozinho.",
    },
    yieldRules: "Sem rendimento automatico no MVP.",
    volatilityBps: 0,
    positiveBiasBps: 0,
  },
  {
    id: "asset-tsf001",
    symbol: "TSF001",
    name: "Tesouro Selic Fortuna",
    assetClass: AssetClass.FIXED_INCOME,
    basePriceCents: 10_000,
    riskLevel: MarketRiskLevel.LOW,
    liquidity: LiquidityLevel.DAILY,
    expectedYield: {
      symbol: "TSF001",
      yieldType: YieldType.FIXED_RATE,
      periodicity: YieldPeriodicity.DAILY,
      rateBps: 8,
      description:
        "Rendimento diario previsivel, simulado em basis points e calculado em centavos.",
    },
    educationalInfo: {
      symbol: "TSF001",
      shortDescription:
        "Renda fixa inspirada em titulo publico de liquidez diaria.",
      longDescription:
        "Ativo ficticio de baixo risco para ensinar previsibilidade, liquidez e acumulacao gradual.",
      riskExplanation:
        "Baixo risco: a variacao simulada e pequena e tende a ser positiva.",
      liquidityExplanation:
        "Liquidez diaria simulada para resgates planejados.",
      beginnerTip:
        "Use renda fixa para objetivos proximos e reserva de seguranca.",
      mentorHint:
        "Crescimento lento tambem e crescimento, principalmente quando e consistente.",
    },
    yieldRules:
      "O provider informa taxa esperada; credito na carteira pertence ao dominio financeiro.",
    volatilityBps: 3,
    positiveBiasBps: 2,
  },
  {
    id: "asset-cdblf001",
    symbol: "CDBLF001",
    name: "CDB Liquidez Fortuna",
    assetClass: AssetClass.FIXED_INCOME,
    basePriceCents: 5_000,
    riskLevel: MarketRiskLevel.MEDIUM,
    liquidity: LiquidityLevel.DAILY,
    expectedYield: {
      symbol: "CDBLF001",
      yieldType: YieldType.FIXED_RATE,
      periodicity: YieldPeriodicity.DAILY,
      rateBps: 11,
      description:
        "Rendimento diario simulado ligeiramente superior ao Tesouro Selic Fortuna.",
    },
    educationalInfo: {
      symbol: "CDBLF001",
      shortDescription: "Renda fixa bancaria com liquidez diaria simulada.",
      longDescription:
        "Ativo ficticio para comparar risco bancario, liquidez e retorno esperado.",
      riskExplanation:
        "Baixo a medio risco: retorno esperado maior vem com risco educativo maior.",
      liquidityExplanation: "Liquidez diaria, mas nao imediata como caixa.",
      beginnerTip: "Compare retorno e liquidez antes de escolher um CDB.",
      mentorHint: "Retorno maior pode cobrar seu preco em risco e prazo.",
    },
    yieldRules:
      "O provider informa taxa esperada; credito na carteira pertence ao dominio financeiro.",
    volatilityBps: 4,
    positiveBiasBps: 3,
  },
  {
    id: "asset-fiisf001",
    symbol: "FIISF001",
    name: "FII Shopping Fortuna",
    assetClass: AssetClass.FII,
    basePriceCents: 10_000,
    riskLevel: MarketRiskLevel.MEDIUM,
    liquidity: LiquidityLevel.MEDIUM,
    expectedYield: {
      symbol: "FIISF001",
      yieldType: YieldType.DISTRIBUTION,
      periodicity: YieldPeriodicity.MONTHLY,
      amountPerUnitCents: 70,
      description: "Rendimento mensal simulado por cota.",
    },
    educationalInfo: {
      symbol: "FIISF001",
      shortDescription: "Fundo imobiliario ficticio focado em shoppings.",
      longDescription:
        "Ensina renda recorrente, vacancia, consumo e oscilacao de cotas em FIIs.",
      riskExplanation:
        "Risco medio: o preco pode variar e o rendimento nao e caixa garantido.",
      liquidityExplanation:
        "Liquidez media, representando negociacao menos imediata.",
      beginnerTip: "FIIs podem combinar renda mensal e variacao de preco.",
      mentorHint: "Olhe para renda e risco juntos; aluguel tambem tem ciclos.",
    },
    yieldRules:
      "O provider informa valor esperado por cota; aplicacao depende da carteira.",
    volatilityBps: 120,
    positiveBiasBps: 0,
  },
  {
    id: "asset-fiilf001",
    symbol: "FIILF001",
    name: "FII Logistica Fortuna",
    assetClass: AssetClass.FII,
    basePriceCents: 11_000,
    riskLevel: MarketRiskLevel.MEDIUM,
    liquidity: LiquidityLevel.MEDIUM,
    expectedYield: {
      symbol: "FIILF001",
      yieldType: YieldType.DISTRIBUTION,
      periodicity: YieldPeriodicity.MONTHLY,
      amountPerUnitCents: 78,
      description: "Rendimento mensal simulado por cota de logistica.",
    },
    educationalInfo: {
      symbol: "FIILF001",
      shortDescription:
        "Fundo imobiliario ficticio focado em galpoes logisticos.",
      longDescription:
        "Mostra como comercio, distribuicao e contratos podem influenciar FIIs logisticos.",
      riskExplanation:
        "Risco medio: contratos e vacancia afetam preco e renda.",
      liquidityExplanation:
        "Liquidez media, adequada para objetivos nao imediatos.",
      beginnerTip:
        "Diversificar setores de FIIs reduz dependencia de um unico ciclo.",
      mentorHint:
        "A cidade precisa de lojas e tambem de caminhos para entregar valor.",
    },
    yieldRules:
      "O provider informa valor esperado por cota; aplicacao depende da carteira.",
    volatilityBps: 130,
    positiveBiasBps: 0,
  },
  {
    id: "asset-aef001",
    symbol: "AEF001",
    name: "Acao Energia Fortuna",
    assetClass: AssetClass.STOCK,
    basePriceCents: 2_500,
    riskLevel: MarketRiskLevel.MEDIUM_HIGH,
    liquidity: LiquidityLevel.HIGH,
    expectedYield: {
      symbol: "AEF001",
      yieldType: YieldType.EVENTUAL_DIVIDEND,
      periodicity: YieldPeriodicity.EVENTUAL,
      rateBps: 0,
      description: "Dividendos eventuais podem ser modelados futuramente.",
    },
    educationalInfo: {
      symbol: "AEF001",
      shortDescription: "Acao ficticia do setor de energia.",
      longDescription:
        "Ativo de renda variavel para ensinar oscilacao de preco, risco setorial e liquidez.",
      riskExplanation:
        "Risco medio/alto: preco oscila mais que renda fixa e FIIs.",
      liquidityExplanation:
        "Liquidez alta simulada, com compra e venda simples no MVP.",
      beginnerTip:
        "Acoes podem valorizar, mas tambem cair. Tamanho da posicao importa.",
      mentorHint: "Energia move a cidade, mas o mercado muda o ritmo.",
    },
    yieldRules: "Sem aplicacao automatica de dividendos no MVP.",
    volatilityBps: 260,
    positiveBiasBps: 0,
  },
  {
    id: "asset-atf001",
    symbol: "ATF001",
    name: "Acao Tecnologia Fortuna",
    assetClass: AssetClass.STOCK,
    basePriceCents: 3_000,
    riskLevel: MarketRiskLevel.HIGH,
    liquidity: LiquidityLevel.HIGH,
    expectedYield: {
      symbol: "ATF001",
      yieldType: YieldType.NONE,
      periodicity: YieldPeriodicity.NONE,
      amountPerUnitCents: 0,
      rateBps: 0,
      description: "Sem rendimento obrigatorio no MVP.",
    },
    educationalInfo: {
      symbol: "ATF001",
      shortDescription: "Acao ficticia de empresa de tecnologia.",
      longDescription:
        "Ativo de maior volatilidade para ensinar potencial de crescimento e risco elevado.",
      riskExplanation: "Risco alto: variacoes de preco sao mais intensas.",
      liquidityExplanation:
        "Liquidez alta simulada, adequada para o fluxo do jogo.",
      beginnerTip:
        "Maior potencial de variacao pede mais cuidado com concentracao.",
      mentorHint:
        "Inovacao acelera, mas curvas fechadas testam o planejamento.",
    },
    yieldRules: "Sem rendimento automatico no MVP.",
    volatilityBps: 420,
    positiveBiasBps: 0,
  },
];

const FALLBACK_REAL_SYMBOLS = new Map<string, MockAssetDefinition>(
  [
    ["PETR4", "Petrobras PN"],
    ["VALE3", "Vale ON"],
    ["ITUB4", "Itau Unibanco PN"],
    ["MGLU3", "Magazine Luiza ON"],
  ].map(([symbol, name], index) => [
    symbol,
    {
      id: `fallback-${symbol.toLowerCase()}`,
      symbol,
      name,
      assetClass: AssetClass.STOCK,
      basePriceCents: 2_000 + index * 750,
      riskLevel: MarketRiskLevel.HIGH,
      liquidity: LiquidityLevel.HIGH,
      expectedYield: {
        symbol,
        yieldType: YieldType.NONE,
        periodicity: YieldPeriodicity.NONE,
        amountPerUnitCents: 0,
        rateBps: 0,
        description: "Proventos reais nao sao aplicados no MVP.",
      },
      educationalInfo: {
        symbol,
        shortDescription: "Cotacao simulada usada como fallback educativo.",
        longDescription:
          "Dados reais indisponiveis no momento. Exibindo dados simulados para fins educativos.",
        riskExplanation:
          "Ativos de renda variavel podem oscilar; este valor e simulado.",
        liquidityExplanation:
          "Liquidez real depende do mercado; no MVP a carteira permanece simulada.",
        beginnerTip:
          "Use a cotacao apenas para observar conceitos, nunca como recomendacao.",
        mentorHint:
          "Quando dados reais falham, o jogo continua com simulacao educativa.",
      },
      yieldRules: "Sem aplicacao automatica de proventos reais no MVP.",
      volatilityBps: 280,
      positiveBiasBps: 0,
    },
  ]),
);

export class MockMarketDataProvider
  implements MarketDataProvider, MarketPriceProvider
{
  private readonly assetsBySymbol = new Map<string, MockAssetDefinition>();
  private readonly seed: string;
  private readonly clock: () => Date;
  private readonly logger?: LoggerPort;
  private currentAsOf: Date;

  constructor(options: MockMarketDataProviderOptions = {}) {
    this.seed = options.seed ?? DEFAULT_SEED;
    this.clock = options.clock ?? (() => DEFAULT_DATE);
    this.logger = options.logger;
    this.currentAsOf = this.clock();

    for (const asset of MOCK_ASSETS) {
      this.assetsBySymbol.set(asset.symbol, asset);
    }
  }

  async listAssets(): Promise<Asset[]> {
    return MOCK_ASSETS.map((asset) => this.toAsset(asset, this.currentAsOf));
  }

  async getQuotes(input: GetQuotesInput): Promise<GetQuotesOutput> {
    const trace = this.trace();
    const quotes = (
      await Promise.all(
        input.symbols.map(async (symbol) => {
          const price = (await this.getCurrentPrice(symbol)) as
            | AssetPrice
            | undefined;
          if (!price) {
            return undefined;
          }
          const asset = this.findDefinition(price.symbol);
          return {
            symbol: price.symbol,
            name: asset?.name,
            priceCents: price.priceCents,
            previousPriceCents: price.previousPriceCents,
            variationBps: price.variationBps,
            currency: "BRL",
            marketTimestamp: price.marketTimestamp,
            updatedAt: price.updatedAt,
            priceStatus: price.priceStatus,
            dataSource: price.dataSource,
            trace,
          };
        }),
      )
    ).filter((quote) => quote !== undefined);

    return {
      quotes,
      errors: input.symbols
        .filter(
          (symbol) =>
            !quotes.some(
              (quote) => quote.symbol === symbol.trim().toUpperCase(),
            ),
        )
        .map((symbol) => ({
          code: MarketDataErrorCode.ASSET_NOT_FOUND,
          message: `Market asset ${symbol} is not available in mock data.`,
          symbol,
          providerName: this.getProviderName(),
        })),
      trace,
    };
  }

  async getHistoricalPrices(
    input: GetHistoricalPricesInput,
  ): Promise<GetHistoricalPricesOutput> {
    const trace = this.trace();
    const prices = await this.getPriceHistory({
      symbol: input.symbol,
      from: input.from ?? this.addDays(this.currentAsOf, -30),
      to: input.to ?? this.currentAsOf,
    });

    return {
      symbol: input.symbol.trim().toUpperCase(),
      prices,
      errors:
        prices.length === 0
          ? [
              {
                code: MarketDataErrorCode.ASSET_NOT_FOUND,
                message: `Market asset ${input.symbol} is not available in mock data.`,
                symbol: input.symbol,
                providerName: this.getProviderName(),
              },
            ]
          : [],
      trace,
    };
  }

  getProviderName(): string {
    return "MockMarketDataProvider";
  }

  getProviderType(): MarketDataProviderType {
    return MarketDataProviderType.MOCK;
  }

  async getAssetById(assetId: string): Promise<Asset | null> {
    const normalized = assetId.trim().toUpperCase();
    const asset = MOCK_ASSETS.find(
      (item) => item.id === assetId || item.symbol === normalized,
    );
    return asset ? this.toAsset(asset, this.currentAsOf) : null;
  }

  async getAsset(symbol: string): Promise<Asset | undefined> {
    const asset = this.findDefinition(symbol);
    return asset ? this.toAsset(asset, this.currentAsOf) : undefined;
  }

  async getCurrentPrice(symbol: string): Promise<AssetPrice | undefined>;
  async getCurrentPrice(asset: DomainAsset): Promise<MarketPrice>;
  async getCurrentPrice(
    symbolOrAsset: string | DomainAsset,
  ): Promise<AssetPrice | MarketPrice | undefined> {
    if (symbolOrAsset instanceof DomainAsset) {
      return this.getDomainMarketPrice(symbolOrAsset);
    }

    const asset = this.findDefinition(symbolOrAsset);
    if (!asset) {
      this.logger?.warn("Market asset not found", {
        module: "market_data",
        action: "market_asset_not_found",
        context: { symbol: symbolOrAsset },
      });
      return undefined;
    }

    const price = this.toAssetPrice(asset, this.currentAsOf);
    this.logger?.debug("Market price consulted", {
      module: "market_data",
      action: "market_price_consulted",
      context: {
        symbol: price.symbol,
        priceCents: price.priceCents,
        dataSource: price.dataSource,
        priceStatus: price.priceStatus,
      },
    });
    return price;
  }

  async getCurrentPrices(assets: DomainAsset[]): Promise<MarketPrice[]> {
    return Promise.all(assets.map((asset) => this.getDomainMarketPrice(asset)));
  }

  async getQuote(symbol: string): Promise<MarketQuote> {
    const price = await this.getCurrentPrice(symbol);
    const marketPrice = price as AssetPrice | undefined;
    if (!marketPrice) {
      throw new Error(`Market asset ${symbol} is not available.`);
    }

    return {
      symbol: marketPrice.symbol,
      price: Money.fromCents(marketPrice.priceCents),
      asOf: marketPrice.marketTimestamp,
      provider: marketPrice.dataSource,
      priceStatus: marketPrice.priceStatus,
    };
  }

  async getPriceHistory(
    requestOrAssetId: PriceHistoryRequest | string,
    options?: { from?: Date; to?: Date },
  ): Promise<AssetHistoryPoint[]> {
    const request =
      typeof requestOrAssetId === "string"
        ? {
            symbol: requestOrAssetId,
            from: options?.from ?? this.addDays(this.currentAsOf, -30),
            to: options?.to ?? this.currentAsOf,
          }
        : requestOrAssetId;
    const marketAsset =
      typeof requestOrAssetId === "string"
        ? await this.getAssetById(requestOrAssetId)
        : undefined;
    const asset = marketAsset
      ? this.findDefinition(marketAsset.symbol)
      : this.findDefinition(request.symbol);
    if (!asset) {
      return [];
    }

    const dates = this.daysBetween(request.from, request.to);
    return dates.map((date) => this.toHistoryPoint(asset, date));
  }

  async getYieldInfo(assetId: string): Promise<ExpectedYield | null> {
    const asset = await this.getAssetById(assetId);
    return asset ? asset.expectedYield : null;
  }

  async getExpectedYield(symbol: string): Promise<ExpectedYield | undefined> {
    return this.findDefinition(symbol)?.expectedYield;
  }

  async getEducationalInfo(
    symbol: string,
  ): Promise<EducationalAssetInfo | undefined> {
    return this.findDefinition(symbol)?.educationalInfo;
  }

  async refreshPrices(
    request: RefreshMarketPricesRequest = {},
  ): Promise<Asset[]> {
    this.currentAsOf = request.asOf ?? this.clock();
    this.logger?.info("Mock market prices refreshed", {
      module: "market_data",
      action: "mock_market_prices_refreshed",
      context: {
        asOf: this.currentAsOf.toISOString(),
        dataSource: MarketDataSource.MOCK,
      },
    });
    return this.listAssets();
  }

  async getProviderStatus(): Promise<MarketProviderStatus> {
    return {
      sessionStatus: MarketSessionStatus.SIMULATED,
      dataSource: MarketDataSource.MOCK,
      priceStatus: PriceStatus.SIMULATED,
      checkedAt: this.clock(),
      message:
        "Mock provider deterministico; providers reais devem tratar mercado fechado, cache, fallback e falha.",
    };
  }

  private async getDomainMarketPrice(asset: DomainAsset): Promise<MarketPrice> {
    const marketPrice = (await this.getCurrentPrice(
      asset.symbol.value,
    )) as AssetPrice;

    if (!marketPrice) {
      throw new Error(`Market asset ${asset.symbol.value} is not available.`);
    }

    return new MarketPrice(
      asset,
      MoneyCents.fromCents(marketPrice.priceCents),
      marketPrice.marketTimestamp,
    );
  }

  private findDefinition(symbol: string): MockAssetDefinition | undefined {
    const normalized = AssetSymbol.create(symbol).value;
    return (
      this.assetsBySymbol.get(normalized) ??
      FALLBACK_REAL_SYMBOLS.get(normalized)
    );
  }

  private trace(): MarketDataTrace {
    return {
      source: "mock",
      providerName: this.getProviderName(),
      isRealData: false,
      isCached: false,
      isFallback: false,
      fetchedAt: this.clock(),
      disclaimer: EDUCATIONAL_MARKET_DATA_DISCLAIMER,
    };
  }

  private toAsset(asset: MockAssetDefinition, asOf: Date): Asset {
    const price = this.toAssetPrice(asset, asOf);
    return {
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      assetClass: asset.assetClass,
      currentPriceCents: price.priceCents,
      previousPriceCents: price.previousPriceCents,
      variationBps: price.variationBps,
      riskLevel: asset.riskLevel,
      liquidity: asset.liquidity,
      expectedYield: asset.expectedYield,
      educationalDescription: asset.educationalInfo.shortDescription,
      yieldRules: asset.yieldRules,
      isMocked: true,
      priceStatus: price.priceStatus,
      dataSource: price.dataSource,
      updatedAt: price.updatedAt,
    };
  }

  private toAssetPrice(asset: MockAssetDefinition, asOf: Date): AssetPrice {
    const previousDate = this.addDays(this.startOfUtcDay(asOf), -1);
    const priceCents = this.simulateClosePriceCents(asset, asOf);
    const previousPriceCents = this.simulateClosePriceCents(
      asset,
      previousDate,
    );

    return {
      assetId: asset.id,
      symbol: asset.symbol,
      priceCents,
      previousPriceCents,
      variationBps: this.calculateVariationBps(priceCents, previousPriceCents),
      priceStatus: PriceStatus.SIMULATED,
      dataSource: MarketDataSource.MOCK,
      marketTimestamp: asOf,
      updatedAt: asOf,
    };
  }

  private toHistoryPoint(
    asset: MockAssetDefinition,
    date: Date,
  ): AssetHistoryPoint {
    const closePriceCents = this.simulateClosePriceCents(asset, date);
    const openPriceCents = this.simulateOpenPriceCents(asset, date);
    const minPriceCents = Math.max(
      1,
      Math.min(openPriceCents, closePriceCents) -
        this.integerBpsAmount(
          Math.min(openPriceCents, closePriceCents),
          this.intradaySpreadBps(asset, date),
        ),
    );
    const maxPriceCents =
      Math.max(openPriceCents, closePriceCents) +
      this.integerBpsAmount(
        Math.max(openPriceCents, closePriceCents),
        this.intradaySpreadBps(asset, this.addDays(date, 1)),
      );

    return {
      symbol: asset.symbol,
      date: this.startOfUtcDay(date),
      openPriceCents,
      closePriceCents,
      minPriceCents,
      maxPriceCents,
      volume:
        asset.assetClass === AssetClass.CASH ? 0 : this.mockVolume(asset, date),
    };
  }

  private simulateOpenPriceCents(
    asset: MockAssetDefinition,
    date: Date,
  ): number {
    if (asset.assetClass === AssetClass.CASH) {
      return asset.basePriceCents;
    }

    const previousClose = this.simulateClosePriceCents(
      asset,
      this.addDays(date, -1),
    );
    const openVariationBps = this.deterministicVariationBps(
      asset,
      date,
      "open",
    );
    return this.applyBps(previousClose, openVariationBps);
  }

  private simulateClosePriceCents(
    asset: MockAssetDefinition,
    date: Date,
  ): number {
    if (asset.assetClass === AssetClass.CASH) {
      return asset.basePriceCents;
    }

    const days = Math.max(0, this.daysSinceEpoch(date));
    let priceCents = asset.basePriceCents;
    const cursor = new Date(Date.UTC(2026, 0, 1));

    for (let day = 0; day <= days % 730; day += 1) {
      const variationBps = this.deterministicVariationBps(
        asset,
        cursor,
        "close",
      );
      priceCents = this.applyBps(priceCents, variationBps);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return Math.max(1, priceCents);
  }

  private deterministicVariationBps(
    asset: MockAssetDefinition,
    date: Date,
    phase: "open" | "close",
  ): number {
    if (asset.volatilityBps === 0) {
      return 0;
    }

    const normalizedDate = this.startOfUtcDay(date).toISOString().slice(0, 10);
    const hash = this.hash(
      `${this.seed}:${asset.symbol}:${normalizedDate}:${phase}`,
    );
    const range = asset.volatilityBps * 2 + 1;
    const raw = hash % range;
    const centered = raw - asset.volatilityBps;

    if (asset.assetClass === AssetClass.FIXED_INCOME) {
      return Math.max(1, asset.positiveBiasBps + Math.abs(centered % 3));
    }

    return centered + asset.positiveBiasBps;
  }

  private applyBps(amountCents: number, bps: number): number {
    const numerator = amountCents * (10_000 + bps);
    const rounded = Math.trunc((numerator + 5_000) / 10_000);
    return Math.max(1, rounded);
  }

  private integerBpsAmount(amountCents: number, bps: number): number {
    return Math.trunc((amountCents * bps + 5_000) / 10_000);
  }

  private calculateVariationBps(
    currentCents: number,
    previousCents: number,
  ): number {
    if (previousCents <= 0) {
      return 0;
    }

    return Math.trunc(
      ((currentCents - previousCents) * 10_000) / previousCents,
    );
  }

  private intradaySpreadBps(asset: MockAssetDefinition, date: Date): number {
    if (asset.assetClass === AssetClass.CASH) {
      return 0;
    }

    return Math.max(
      1,
      this.hash(`${this.seed}:${asset.symbol}:${date.toISOString()}:spread`) %
        Math.max(2, Math.trunc(asset.volatilityBps / 3)),
    );
  }

  private mockVolume(asset: MockAssetDefinition, date: Date): number {
    const base =
      asset.assetClass === AssetClass.STOCK
        ? 20_000
        : asset.assetClass === AssetClass.FII
          ? 8_000
          : 2_000;
    return (
      base +
      (this.hash(`${this.seed}:${asset.symbol}:${date.toISOString()}:volume`) %
        base)
    );
  }

  private daysBetween(from: Date, to: Date): Date[] {
    const start = this.startOfUtcDay(from);
    const end = this.startOfUtcDay(to);
    if (start > end) {
      return [];
    }

    const dates: Date[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      dates.push(new Date(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return dates;
  }

  private daysSinceEpoch(date: Date): number {
    const start = Date.UTC(2026, 0, 1);
    const current = this.startOfUtcDay(date).getTime();
    return Math.trunc((current - start) / 86_400_000);
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  private startOfUtcDay(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private hash(input: string): number {
    let hash = 2_166_136_261;
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16_777_619);
    }
    return hash >>> 0;
  }
}

export function toDomainAsset(asset: Asset): DomainAsset {
  return new DomainAsset(
    asset.id,
    AssetSymbol.create(asset.symbol),
    asset.name,
    toDomainAssetType(asset.assetClass),
    toDomainRiskLevel(asset.riskLevel),
    true,
    asset.liquidity,
  );
}

function toDomainAssetType(assetClass: AssetClass): AssetType {
  switch (assetClass) {
    case AssetClass.CASH:
      return AssetType.CASH;
    case AssetClass.FIXED_INCOME:
      return AssetType.FIXED_INCOME;
    case AssetClass.FII:
      return AssetType.FII;
    case AssetClass.STOCK:
      return AssetType.STOCK;
    default:
      throw new Error(`Unsupported asset class: ${assetClass}`);
  }
}

function toDomainRiskLevel(riskLevel: MarketRiskLevel): RiskLevel {
  switch (riskLevel) {
    case MarketRiskLevel.NONE:
    case MarketRiskLevel.LOW:
      return RiskLevel.LOW;
    case MarketRiskLevel.MEDIUM:
      return RiskLevel.MEDIUM;
    case MarketRiskLevel.MEDIUM_HIGH:
    case MarketRiskLevel.HIGH:
      return RiskLevel.HIGH;
    default:
      throw new Error(`Unsupported risk level: ${riskLevel}`);
  }
}
