import { Controller, Get, Param } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { PlayerApiService } from "../player/player-api.service.js";
import {
  ApiErrorDto,
  AssetDetailsResponseDto,
  AssetResponseDto,
} from "../player/player.dto.js";

@ApiTags("assets")
@Controller(["api/v1/assets", "assets"])
export class AssetsController {
  constructor(private readonly api: PlayerApiService) {}

  @Get()
  @ApiOperation({ summary: "Listar ativos mockados disponiveis no MVP." })
  @ApiOkResponse({ type: AssetResponseDto, isArray: true })
  listAssets(): Promise<AssetResponseDto[]> {
    return this.api.listAssets();
  }

  @Get(":symbol")
  @ApiOperation({ summary: "Consultar detalhes educativos de um ativo." })
  @ApiOkResponse({ type: AssetDetailsResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  getAssetDetails(
    @Param("symbol") symbol: string,
  ): Promise<AssetDetailsResponseDto> {
    return this.api.getAssetDetails(symbol);
  }
}
