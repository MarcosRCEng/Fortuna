import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
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
  RefreshMarketPricesRequestDto,
} from "../player/player.dto.js";

@ApiTags("market")
@Controller(["api/v1/market", "market"])
export class MarketController {
  constructor(private readonly api: PlayerApiService) {}

  @Get("quotes/:symbol")
  @ApiOperation({ summary: "Consultar cotacao mockada de um ativo." })
  @ApiOkResponse({ type: MarketQuoteResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  getQuote(@Param("symbol") symbol: string): Promise<MarketQuoteResponseDto> {
    return this.api.getQuote(symbol);
  }

  @Get("history/:symbol")
  @ApiOperation({ summary: "Consultar historico simulado de precos." })
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
  @ApiOperation({ summary: "Consultar rendimento esperado do ativo." })
  @ApiOkResponse({ type: ExpectedYieldResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  getExpectedYield(
    @Param("symbol") symbol: string,
  ): Promise<ExpectedYieldResponseDto> {
    return this.api.getExpectedYield(symbol);
  }

  @Get("status")
  @ApiOperation({ summary: "Consultar status do provider de mercado." })
  @ApiOkResponse({ type: MarketProviderStatusResponseDto })
  getStatus(): Promise<MarketProviderStatusResponseDto> {
    return this.api.getMarketProviderStatus();
  }

  @Post("refresh")
  @ApiOperation({ summary: "Recalcular precos mockados com data simulada." })
  @ApiOkResponse({ type: AssetResponseDto, isArray: true })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  refreshPrices(
    @Body() request: RefreshMarketPricesRequestDto,
  ): Promise<AssetResponseDto[]> {
    return this.api.refreshMarketPrices(request);
  }
}
