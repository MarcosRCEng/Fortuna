import {
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

@ApiTags("market")
@Controller(["api/v1/market", "market"])
export class MarketController {
  @Inject(PlayerApiService)
  private readonly api!: PlayerApiService;

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
    summary: "Consultar status do provider de mercado.",
    description:
      "Informa que o MVP usa provider simulado e deterministico, sem dados reais de mercado.",
  })
  @ApiOkResponse({ type: MarketProviderStatusResponseDto })
  getStatus(): Promise<MarketProviderStatusResponseDto> {
    return this.api.getMarketProviderStatus();
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
}
