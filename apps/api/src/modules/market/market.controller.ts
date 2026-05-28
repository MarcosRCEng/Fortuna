import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { PlayerApiService } from "../player/player-api.service.js";
import {
  ApiErrorDto,
  AssetHistoryPointResponseDto,
  AssetResponseDto,
  ExpectedYieldResponseDto,
  MarketProviderStatusResponseDto,
  MarketQuoteResponseDto,
  MarketRefreshResponseDto,
  RefreshMarketPricesResponseDto,
  RefreshMarketPricesRequestDto,
} from "../player/player.dto.js";
import {
  MarketValidationError,
  MvpMarketDataService,
  PinoLogger,
} from "@fortuna/infrastructure";
import type {
  HistoricalPrice,
  MarketAsset,
  MarketHistoryInterval,
  MarketHistoryRange,
  MarketQuote,
} from "@fortuna/domain";

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
    allowedSymbols: string[];
    lastSuccessfulFetchAt: string | null;
    status: "ok" | "degraded" | "mock_only";
  };
};

@ApiTags("market")
@Controller(["api/v1/market", "market"])
export class MarketController {
  @Inject(PlayerApiService)
  private readonly api!: PlayerApiService;
  private readonly marketData = new MvpMarketDataService({
    logger: new PinoLogger(),
  });

  @Get("assets")
  @ApiOperation({
    summary: "Listar ativos permitidos para dados de mercado no MVP.",
    description:
      "Retorna uma allowlist pequena e local. Nao consulta a lista completa da brapi.",
  })
  async listMarketAssets(): Promise<MarketAssetsResponse> {
    return { data: this.marketData.listAssets() };
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

  @Get("status")
  @ApiOperation({
    summary: "Consultar status da camada de Market Data.",
    description:
      "Informa provider configurado, flag de dados reais, presenca de token, cache, allowlist e estado geral.",
  })
  @ApiOkResponse({ type: MarketProviderStatusResponseDto })
  getStatus(): MarketStatusResponse {
    const status = this.marketData.getStatus();
    return {
      data: {
        provider: status.provider,
        realDataEnabled: status.realDataEnabled,
        hasBrapiToken: status.hasToken,
        cacheTtlSeconds: status.cacheTtlSeconds,
        allowedSymbols: this.marketData.getAllowedSymbols(),
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
}
