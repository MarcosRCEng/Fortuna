import { Controller, Get, Param } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { PlayerApiService } from "../player/player-api.service.js";
import { ApiErrorDto, MarketQuoteResponseDto } from "../player/player.dto.js";

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
}
