import { Controller, Get, Param } from "@nestjs/common";
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
  AssetDetailsResponseDto,
  AssetResponseDto,
} from "../player/player.dto.js";

@ApiTags("assets")
@Controller(["api/v1/assets", "assets"])
export class AssetsController {
  constructor(private readonly api: PlayerApiService) {}

  @Get()
  @ApiOperation({
    summary: "Listar ativos mockados disponiveis no MVP.",
    description:
      "Retorna catalogo educativo com precos em centavos inteiros e origem MOCK.",
  })
  @ApiOkResponse({ type: AssetResponseDto, isArray: true })
  listAssets(): Promise<AssetResponseDto[]> {
    return this.api.listAssets();
  }

  @Get(":symbol")
  @ApiOperation({
    summary: "Consultar detalhes educativos de um ativo.",
    description:
      "Consulta detalhes do ativo pelo identificador simbolico estavel do catalogo mockado.",
  })
  @ApiOkResponse({ type: AssetDetailsResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  getAssetDetails(
    @Param("symbol") symbol: string,
  ): Promise<AssetDetailsResponseDto> {
    return this.api.getAssetDetails(symbol);
  }
}
