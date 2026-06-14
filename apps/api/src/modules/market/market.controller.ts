import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiProperty,
  ApiPropertyOptional,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { PlayerApiService } from "../player/player-api.service.js";
import {
  ApiErrorDto,
  AssetHistoryPointResponseDto,
  AssetResponseDto,
  ExpectedYieldResponseDto,
  MarketQuoteResponseDto,
  MarketRefreshResponseDto,
  RefreshMarketPricesResponseDto,
  RefreshMarketPricesRequestDto,
} from "../player/player.dto.js";
import {
  createFiiDetailsProvider,
  createTreasuryMarketProvider,
  MarketValidationError,
  MarketProCapabilityDisabledError,
  MarketProProviderRequestError,
  MvpMarketDataService,
  PinoLogger,
  readMarketDataConfig,
} from "@fortuna/infrastructure";
import type {
  FiiDetails,
  FiiDividend,
  HistoricalPrice,
  MarketAssetType,
  MarketCatalogItem,
  MarketCatalogPage,
  MarketCatalogSortBy,
  MarketCatalogSortOrder,
  MarketProviderCapabilities,
  MarketAsset,
  MarketHistoryInterval,
  MarketHistoryRange,
  MarketProDataState,
  MarketQuote,
  TreasuryCatalogPage,
  TreasuryHistory,
  TreasuryIndicator,
} from "@fortuna/domain";

const CATALOG_TYPE_FILTER_VALUES: Exclude<MarketAssetType, "UNKNOWN">[] = [
  "STOCK",
  "UNIT",
  "FII",
  "ETF",
  "FI_INFRA",
  "FI_AGRO",
  "FIP",
  "FIDC",
  "BDR",
  "TREASURY",
];
const CATALOG_SORT_BY_VALUES: MarketCatalogSortBy[] = [
  "name",
  "price",
  "changePercent",
  "volume",
  "marketCap",
];
const CATALOG_SORT_ORDER_VALUES: MarketCatalogSortOrder[] = ["asc", "desc"];

class MarketCatalogQueryDto {
  @ApiPropertyOptional({ example: "ITUB4" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: "STOCK,FII",
    description: "Tipos canonicos separados por virgula.",
  })
  @IsOptional()
  @IsString()
  types?: string;

  @ApiPropertyOptional({
    example: "Financeiro,Logistica",
    description: "Setores separados por virgula.",
  })
  @IsOptional()
  @IsString()
  sectors?: string;

  @ApiPropertyOptional({ enum: CATALOG_SORT_BY_VALUES, example: "name" })
  @IsOptional()
  @IsIn(CATALOG_SORT_BY_VALUES)
  sortBy?: MarketCatalogSortBy;

  @ApiPropertyOptional({ enum: CATALOG_SORT_ORDER_VALUES, example: "asc" })
  @IsOptional()
  @IsIn(CATALOG_SORT_ORDER_VALUES)
  sortOrder?: MarketCatalogSortOrder;

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}

class MarketCatalogItemResponseDto implements MarketCatalogItem {
  @ApiProperty({ example: "ITUB4" })
  symbol!: string;

  @ApiProperty({ example: "Itau Unibanco PN" })
  name!: string;

  @ApiProperty({ enum: [...CATALOG_TYPE_FILTER_VALUES, "UNKNOWN"] })
  type!: MarketAssetType;

  @ApiProperty({ example: "EQUITIES" })
  group!: MarketCatalogItem["group"];

  @ApiPropertyOptional({ example: "Financeiro" })
  sector?: string;

  @ApiPropertyOptional({ example: 3425 })
  priceCents?: number;

  @ApiPropertyOptional({ example: 1.24 })
  changePercent?: number;

  @ApiPropertyOptional({ example: 22500000 })
  volume?: number;

  @ApiPropertyOptional({ example: 32000000000000 })
  marketCapCents?: number;

  @ApiPropertyOptional({ example: "https://example.com/logo.png" })
  logoUrl?: string;

  @ApiProperty({ example: "BRL" })
  currency!: "BRL";

  @ApiProperty({ example: true })
  tradableInFortuna!: boolean;
}

class MarketCatalogPageResponseDto implements MarketCatalogPage {
  @ApiProperty({ type: MarketCatalogItemResponseDto, isArray: true })
  items!: MarketCatalogItemResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 42 })
  totalItems!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;

  @ApiProperty({ example: true })
  hasNextPage!: boolean;

  @ApiProperty({ enum: ["BRAPI", "MOCK", "CACHE"], example: "MOCK" })
  source!: MarketCatalogPage["source"];

  @ApiProperty({ example: false })
  delayed!: boolean;

  @ApiProperty({ example: "2026-05-28T18:00:00.000Z" })
  fetchedAt!: string;
}

class MarketProviderCapabilitiesResponseDto implements MarketProviderCapabilities {
  @ApiProperty({ example: true })
  listedCatalog!: boolean;

  @ApiProperty({ example: true })
  basicQuotes!: boolean;

  @ApiProperty({ example: false })
  detailedFiiData!: boolean;

  @ApiProperty({ example: false })
  treasury!: boolean;

  @ApiProperty({ example: false })
  analystConsensus!: false;
}

class MarketStatusDataResponseDto {
  @ApiProperty({ enum: ["brapi", "mock", "cache"], example: "brapi" })
  provider!: "brapi" | "mock" | "cache";

  @ApiProperty({ example: false })
  realDataEnabled!: boolean;

  @ApiProperty({ example: false })
  hasBrapiToken!: boolean;

  @ApiProperty({ example: 900 })
  cacheTtlSeconds!: number;

  @ApiProperty({ example: 900 })
  catalogCacheTtlSeconds!: number;

  @ApiProperty({ example: 50 })
  catalogMaxPageSize!: number;

  @ApiProperty({ example: 3 })
  catalogProviderConcurrency!: number;

  @ApiProperty({ example: ["PETR4", "VALE3", "ITUB4", "MGLU3"] })
  allowedSymbols!: string[];

  @ApiProperty({ type: MarketProviderCapabilitiesResponseDto })
  capabilities!: MarketProviderCapabilitiesResponseDto;

  @ApiProperty({ example: null, nullable: true })
  lastSuccessfulFetchAt!: string | null;

  @ApiProperty({ enum: ["ok", "degraded", "mock_only"], example: "mock_only" })
  status!: "ok" | "degraded" | "mock_only";
}

class MarketStatusResponseDto {
  @ApiProperty({ type: MarketStatusDataResponseDto })
  data!: MarketStatusDataResponseDto;
}

class MarketProUnavailableResponseDto {
  @ApiProperty({ example: "NOT_AVAILABLE_IN_CURRENT_PLAN" })
  state!: "NOT_AVAILABLE_IN_CURRENT_PLAN";

  @ApiProperty({ example: null, nullable: true })
  data!: null;
}

class FiiDetailsResponseDto {
  @ApiProperty({ example: "HGLG11" })
  symbol!: string;

  @ApiPropertyOptional({ example: 104 })
  priceToBookBps?: number;

  @ApiPropertyOptional({ example: 820 })
  dividendYield12MonthsBps?: number;

  @ApiPropertyOptional({ example: 520000000000 })
  equityValueCents?: number;

  @ApiPropertyOptional({ example: 720 })
  vacancyBps?: number;

  @ApiPropertyOptional({ example: "Logistica" })
  segment?: string;

  @ApiPropertyOptional({ example: "ACTIVE" })
  managementType?: string;

  @ApiPropertyOptional({ example: "BRICK" })
  mandate?: string;

  @ApiPropertyOptional({ example: 320000 })
  shareholderCount?: number;

  @ApiProperty({ example: "2026-06-12" })
  referenceDate!: string;

  @ApiProperty({ example: "BRAPI" })
  source!: string;

  @ApiPropertyOptional({ example: 15 })
  delayMinutes?: number;

  @ApiProperty({ example: "DELAYED" })
  dataState!: MarketProDataState;
}

class FiiDividendResponseDto {
  @ApiProperty({ example: "HGLG11" })
  symbol!: string;

  @ApiProperty({ example: 110 })
  amountCents!: number;

  @ApiProperty({ example: "2026-06-14" })
  paymentDate!: string;

  @ApiPropertyOptional({ example: "2026-05-31" })
  baseDate?: string;

  @ApiProperty({ example: "BRAPI" })
  source!: string;

  @ApiProperty({ example: "REAL" })
  dataState!: MarketProDataState;
}

class TreasuryCatalogQueryDto {
  @ApiPropertyOptional({ example: "selic" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}

class TreasuryIndicatorsQueryDto {
  @ApiProperty({ example: "tesouro-selic-2029,tesouro-ipca-2035" })
  @IsString()
  symbols!: string;
}

class TreasuryHistoryQueryDto {
  @ApiPropertyOptional({ example: "2026-01-01" })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: "2026-06-12" })
  @IsOptional()
  @IsString()
  to?: string;
}

class TreasuryBondResponseDto {
  @ApiProperty({ example: "tesouro-selic-2029" })
  symbol!: string;

  @ApiProperty({ example: "Tesouro Selic 2029" })
  name!: string;

  @ApiProperty({ example: "SELIC" })
  bondType!: string;

  @ApiProperty({ example: "SELIC" })
  indexer!: string;

  @ApiProperty({ example: "NONE" })
  couponType!: string;

  @ApiProperty({ example: "2029-03-01" })
  maturityDate!: string;

  @ApiPropertyOptional({ example: 1025 })
  buyRateBps?: number;

  @ApiPropertyOptional({ example: 1012 })
  sellRateBps?: number;

  @ApiProperty({ example: "ANNUAL_PERCENT" })
  rateInterpretation!: string;

  @ApiPropertyOptional({ example: 153254 })
  buyPriceCents?: number;

  @ApiPropertyOptional({ example: 153120 })
  sellPriceCents?: number;

  @ApiPropertyOptional({ example: 153200 })
  basePriceCents?: number;

  @ApiPropertyOptional({ example: 998 })
  durationDays?: number;

  @ApiProperty({ example: "2026-06-12" })
  referenceDate!: string;

  @ApiProperty({ example: "BRAPI" })
  source!: string;

  @ApiProperty({ example: "REAL" })
  dataState!: MarketProDataState;
}

type MarketAssetsResponse = {
  data: MarketAsset[];
};

type MarketQuotesResponse = {
  data: MarketQuote[];
  meta: {
    cacheTtlSeconds: number;
    realDataEnabled: boolean;
  };
};

type MarketHistoryResponse = {
  data: HistoricalPrice[];
  meta: {
    symbol: string;
    range: MarketHistoryRange;
    interval: MarketHistoryInterval;
    cacheTtlSeconds: number;
    realDataEnabled: boolean;
  };
};

type MarketStatusResponse = {
  data: {
    provider: "brapi" | "mock" | "cache";
    realDataEnabled: boolean;
    hasBrapiToken: boolean;
    cacheTtlSeconds: number;
    catalogCacheTtlSeconds: number;
    catalogMaxPageSize: number;
    catalogProviderConcurrency: number;
    allowedSymbols: string[];
    capabilities: MarketProviderCapabilities;
    lastSuccessfulFetchAt: string | null;
    status: "ok" | "degraded" | "mock_only";
  };
};

type MarketProResponse<T> =
  | {
      state: MarketProDataState;
      data: T;
    }
  | {
      state: "NOT_AVAILABLE_IN_CURRENT_PLAN";
      data: null;
    };

@ApiTags("market")
@Controller(["api/v1/market", "market"])
export class MarketController {
  @Inject(PlayerApiService)
  private readonly api!: PlayerApiService;
  private readonly logger = new PinoLogger();
  private readonly marketConfig = readMarketDataConfig().config;
  private readonly marketData = new MvpMarketDataService({
    config: this.marketConfig,
    logger: this.logger,
  });
  private readonly fiiDetailsProvider = createFiiDetailsProvider(
    this.marketConfig,
    this.logger,
  );
  private readonly treasuryMarketProvider = createTreasuryMarketProvider(
    this.marketConfig,
    this.logger,
  );

  @Get("assets")
  @ApiOperation({
    summary: "Listar ativos permitidos para dados de mercado no MVP.",
    description:
      "Retorna uma allowlist pequena e local. Nao consulta a lista completa da brapi.",
  })
  async listMarketAssets(): Promise<MarketAssetsResponse> {
    return { data: this.marketData.listAssets() };
  }

  @Get("catalog")
  @ApiOperation({
    summary: "Listar catalogo canonico e paginado de mercado.",
    description:
      "Retorna ativos normalizados por tipo canonico, sem expor o contrato bruto da brapi.",
  })
  @ApiOkResponse({ type: MarketCatalogPageResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  async getMarketCatalog(
    @Query() query: MarketCatalogQueryDto,
  ): Promise<MarketCatalogPage> {
    return this.handleMarketRequest(() =>
      this.marketData.getCatalog({
        search: query.search,
        assetTypes: parseCatalogAssetTypes(query.types),
        sectors: parseCommaSeparatedValues(query.sectors),
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        page: parseCatalogInteger(query.page, "page", 1, 1),
        pageSize: parseCatalogInteger(query.pageSize, "pageSize", 20, 1, 100),
      }),
    );
  }

  @Get("quotes")
  @ApiOperation({
    summary: "Consultar cotacoes atuais de ativos permitidos.",
    description:
      "Usa cache obrigatorio e cai para mock quando dados reais estao desabilitados, sem token ou indisponiveis.",
  })
  async getMarketQuotes(
    @Query("symbols") symbols?: string,
  ): Promise<MarketQuotesResponse> {
    return this.handleMarketRequest(async () => {
      const data = await this.marketData.getQuotes([symbols ?? ""]);
      const status = this.marketData.getStatus();
      return {
        data,
        meta: {
          cacheTtlSeconds: status.cacheTtlSeconds,
          realDataEnabled: status.realDataEnabled,
        },
      };
    });
  }

  @Get("fii/:symbol/details")
  @ApiOperation({
    summary: "Preparar consulta Pro de detalhes de FII.",
    description:
      "Retorna estado explicito quando a capability Pro nao esta disponivel no plano atual.",
  })
  @ApiOkResponse({ type: FiiDetailsResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  async getFiiDetails(
    @Param("symbol") symbol: string,
  ): Promise<MarketProResponse<FiiDetails>> {
    if (!this.marketData.getStatus().capabilities.detailedFiiData) {
      return unavailableInCurrentPlan();
    }
    return this.handleProMarketRequest(async () => {
      const data = await this.fiiDetailsProvider.getFiiDetails(symbol);
      return { state: data.dataState, data };
    });
  }

  @Get("fii/:symbol/dividends")
  @ApiOperation({
    summary: "Preparar consulta Pro de dividendos de FII.",
    description:
      "Valores monetarios retornam em centavos inteiros e nao derivam indicadores Pro.",
  })
  @ApiOkResponse({ type: FiiDividendResponseDto, isArray: true })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  async getFiiDividends(
    @Param("symbol") symbol: string,
  ): Promise<MarketProResponse<FiiDividend[]>> {
    if (!this.marketData.getStatus().capabilities.detailedFiiData) {
      return unavailableInCurrentPlan();
    }
    return this.handleProMarketRequest(async () => {
      const data = await this.fiiDetailsProvider.getFiiDividends(symbol);
      return { state: resolveCollectionState(data), data };
    });
  }

  @Get("treasury/bonds")
  @ApiOperation({
    summary: "Preparar catalogo Pro de Tesouro Direto.",
    description:
      "Tesouro usa simbolos slug proprios e nao e tratado como ticker B3.",
  })
  @ApiOkResponse({ type: TreasuryBondResponseDto, isArray: true })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  async listTreasuryBonds(
    @Query() query: TreasuryCatalogQueryDto,
  ): Promise<MarketProResponse<TreasuryCatalogPage>> {
    if (!this.marketData.getStatus().capabilities.treasury) {
      return unavailableInCurrentPlan();
    }
    return this.handleProMarketRequest(async () => {
      const data = await this.treasuryMarketProvider.listTreasuryBonds({
        search: query.search,
        page: query.page,
        pageSize: query.pageSize,
      });
      return { state: data.dataState, data };
    });
  }

  @Get("treasury/indicators")
  @ApiOperation({
    summary: "Preparar indicadores Pro de Tesouro Direto.",
    description:
      "Taxas percentuais sao retornadas em basis points, separadas de valores em centavos.",
  })
  @ApiOkResponse({ type: TreasuryBondResponseDto, isArray: true })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  async getTreasuryIndicators(
    @Query() query: TreasuryIndicatorsQueryDto,
  ): Promise<MarketProResponse<TreasuryIndicator[]>> {
    if (!this.marketData.getStatus().capabilities.treasury) {
      return unavailableInCurrentPlan();
    }
    return this.handleProMarketRequest(async () => {
      const data = await this.treasuryMarketProvider.getTreasuryIndicators(
        parseRequiredSymbols(query.symbols),
      );
      return { state: resolveCollectionState(data), data };
    });
  }

  @Get("treasury/:symbol/history")
  @ApiOperation({
    summary: "Preparar historico Pro de Tesouro Direto.",
    description:
      "Historico Pro fica isolado do historico basico de cotacao B3.",
  })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  async getTreasuryHistory(
    @Param("symbol") symbol: string,
    @Query() query: TreasuryHistoryQueryDto,
  ): Promise<MarketProResponse<TreasuryHistory>> {
    if (!this.marketData.getStatus().capabilities.treasury) {
      return unavailableInCurrentPlan();
    }
    return this.handleProMarketRequest(async () => {
      const data = await this.treasuryMarketProvider.getTreasuryHistory({
        symbol,
        from: query.from,
        to: query.to,
      });
      return { state: data.dataState, data };
    });
  }

  @Get("assets/:symbol/history")
  @ApiOperation({
    summary: "Consultar historico minimo de precos de um ativo permitido.",
    description:
      "Suporta ranges 1mo, 3mo, 6mo e 1y, apenas com intervalo 1d no MVP.",
  })
  async getMarketHistory(
    @Param("symbol") symbol: string,
    @Query("range") range: MarketHistoryRange = "1mo",
    @Query("interval") interval: MarketHistoryInterval = "1d",
  ): Promise<MarketHistoryResponse> {
    return this.handleMarketRequest(async () => {
      const data = await this.marketData.getHistoricalPrices({
        symbol,
        range,
        interval,
      });
      const status = this.marketData.getStatus();
      return {
        data,
        meta: {
          symbol: symbol.trim().toUpperCase(),
          range,
          interval,
          cacheTtlSeconds: status.cacheTtlSeconds,
          realDataEnabled: status.realDataEnabled,
        },
      };
    });
  }

  @Get("quotes/:symbol")
  @ApiOperation({
    summary: "Consultar cotacao mockada de um ativo.",
    description:
      "Retorna preco em centavos inteiros com status e origem do provider mockado.",
  })
  @ApiOkResponse({ type: MarketQuoteResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  getQuote(@Param("symbol") symbol: string): Promise<MarketQuoteResponseDto> {
    return this.api.getQuote(symbol);
  }

  @Get("history/:symbol")
  @ApiOperation({
    summary: "Consultar historico simulado de precos.",
    description:
      "Retorna serie deterministica com abertura, fechamento, minima e maxima em centavos inteiros.",
  })
  @ApiOkResponse({ type: AssetHistoryPointResponseDto, isArray: true })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  getHistory(
    @Param("symbol") symbol: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ): Promise<AssetHistoryPointResponseDto[]> {
    return this.api.getAssetHistory(symbol, from, to);
  }

  @Get("yields/:symbol")
  @ApiOperation({
    summary: "Consultar rendimento esperado do ativo.",
    description:
      "Retorna regra educativa de rendimento esperado; valores monetarios usam centavos inteiros.",
  })
  @ApiOkResponse({ type: ExpectedYieldResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  getExpectedYield(
    @Param("symbol") symbol: string,
  ): Promise<ExpectedYieldResponseDto> {
    return this.api.getExpectedYield(symbol);
  }

  @Get(["status", "provider/status"])
  @ApiOperation({
    summary: "Consultar status da camada de Market Data.",
    description:
      "Informa provider configurado, flag de dados reais, presenca de token, cache, allowlist e estado geral.",
  })
  @ApiOkResponse({ type: MarketStatusResponseDto })
  getStatus(): MarketStatusResponse {
    const status = this.marketData.getStatus();
    return {
      data: {
        provider: status.provider,
        realDataEnabled: status.realDataEnabled,
        hasBrapiToken: status.hasToken,
        cacheTtlSeconds: status.cacheTtlSeconds,
        catalogCacheTtlSeconds: status.catalogCacheTtlSeconds,
        catalogMaxPageSize: status.catalogMaxPageSize,
        catalogProviderConcurrency: status.catalogProviderConcurrency,
        allowedSymbols: this.marketData.getAllowedSymbols(),
        capabilities: status.capabilities,
        lastSuccessfulFetchAt: status.lastSuccessfulFetchAt ?? null,
        status: status.status,
      },
    };
  }

  @Post("refresh")
  @HttpCode(200)
  @ApiOperation({
    summary: "Atualizar mercado de forma manual e controlada.",
    description:
      "Refresh explicito do MVP. Respeita feature flag, allowlist, cache e fallback; nao implementa polling automatico.",
  })
  @ApiOkResponse({ type: MarketRefreshResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  refreshPrices(
    @Body() request: RefreshMarketPricesRequestDto,
  ): Promise<MarketRefreshResponseDto> {
    return this.api.refreshMarketPrices(request);
  }

  @Post("refresh-mock-prices")
  @HttpCode(200)
  @ApiOperation({
    summary: "Atualizar precos mockados do mercado.",
    description:
      "Atualiza cotacoes simuladas e retorna resumo em centavos inteiros.",
  })
  @ApiOkResponse({ type: RefreshMarketPricesResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  refreshMockPrices(
    @Body() request: RefreshMarketPricesRequestDto = {},
  ): Promise<RefreshMarketPricesResponseDto> {
    return this.api.refreshMockPrices(request);
  }

  private async handleMarketRequest<T>(request: () => Promise<T>): Promise<T> {
    try {
      return await request();
    } catch (error) {
      if (error instanceof MarketValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private async handleProMarketRequest<T>(
    request: () => Promise<MarketProResponse<T>>,
  ): Promise<MarketProResponse<T>> {
    try {
      return await request();
    } catch (error) {
      if (error instanceof MarketValidationError) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof MarketProCapabilityDisabledError) {
        return unavailableInCurrentPlan();
      }
      if (error instanceof MarketProProviderRequestError) {
        if (error.code === "PLAN_FORBIDDEN") {
          throw new ForbiddenException("BRAPI Pro plan does not allow this resource.");
        }
        if (error.code === "TIMEOUT") {
          throw new ServiceUnavailableException("BRAPI Pro provider timed out.");
        }
        if (error.code === "INVALID_RESPONSE") {
          throw new BadRequestException(error.message);
        }
        throw new BadGatewayException("BRAPI Pro provider failed.");
      }
      throw error;
    }
  }
}

function unavailableInCurrentPlan(): MarketProResponse<never> {
  return {
    state: "NOT_AVAILABLE_IN_CURRENT_PLAN",
    data: null,
  };
}

function parseRequiredSymbols(value: string): string[] {
  const symbols = value
    .split(",")
    .map((symbol) => symbol.trim())
    .filter((symbol) => symbol.length > 0);
  if (symbols.length === 0) {
    throw new MarketValidationError("symbols must be a non-empty comma-separated list.");
  }
  return symbols;
}

function resolveCollectionState(
  items: Array<{ dataState: MarketProDataState }>,
): MarketProDataState {
  if (items.length === 0) {
    return "UNAVAILABLE";
  }
  return items.some((item) => item.dataState === "DELAYED") ? "DELAYED" : "REAL";
}

function parseCatalogAssetTypes(
  value: string | undefined,
): MarketAssetType[] | undefined {
  const values = parseCommaSeparatedValues(value);
  if (!values) {
    return undefined;
  }
  const invalidType = values.find(
    (item) =>
      !CATALOG_TYPE_FILTER_VALUES.includes(
        item as (typeof CATALOG_TYPE_FILTER_VALUES)[number],
      ),
  );
  if (invalidType) {
    throw new MarketValidationError(
      `Unknown market asset type: ${invalidType}.`,
    );
  }
  return values as MarketAssetType[];
}

function parseCommaSeparatedValues(
  value: string | undefined,
): string[] | undefined {
  const values = value
    ?.split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return values && values.length > 0 ? [...new Set(values)] : undefined;
}

function parseCatalogInteger(
  value: number | string | undefined,
  fieldName: string,
  fallback: number,
  min: number,
  max = Number.MAX_SAFE_INTEGER,
): number {
  if (value === undefined || value === "") {
    return fallback;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    const range =
      max === Number.MAX_SAFE_INTEGER
        ? `greater than or equal to ${min}`
        : `between ${min} and ${max}`;
    throw new MarketValidationError(
      `${fieldName} must be an integer ${range}.`,
    );
  }
  return parsed;
}
