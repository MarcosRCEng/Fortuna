import { Controller, Get, Inject, Param } from "@nestjs/common";
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
  AssetHistoryResponseDto,
  AssetPriceResponseDto,
  AssetResponseDto,
  AssetYieldResponseDto,
} from "../player/player.dto.js";

@ApiTags("assets")
@Controller(["api/v1/assets", "assets"])
export class AssetsController {
  @Inject(PlayerApiService)
  private readonly api!: PlayerApiService;

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

  @Get(":assetId/history")
  @ApiOperation({ summary: "Consultar historico de precos do ativo." })
  @ApiOkResponse({ type: AssetHistoryResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  getAssetHistory(
    @Param("assetId") assetId: string,
  ): Promise<AssetHistoryResponseDto> {
    return this.api.getAssetHistoryResponse(assetId);
  }

  @Get(":assetId/price")
  @ApiOperation({ summary: "Consultar preco atual do ativo." })
  @ApiOkResponse({ type: AssetPriceResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  getAssetPrice(@Param("assetId") assetId: string): Promise<AssetPriceResponseDto> {
    return this.api.getAssetPrice(assetId);
  }

  @Get(":assetId/yield")
  @ApiOperation({ summary: "Consultar informacoes de rendimento do ativo." })
  @ApiOkResponse({ type: AssetYieldResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  getAssetYield(@Param("assetId") assetId: string): Promise<AssetYieldResponseDto> {
    return this.api.getAssetYield(assetId);
  }

  @Get(":assetId")
  @ApiOperation({
    summary: "Consultar detalhes educativos de um ativo.",
    description:
      "Consulta detalhes do ativo pelo identificador simbolico estavel do catalogo mockado.",
  })
  @ApiOkResponse({ type: AssetDetailsResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  getAssetDetails(
    @Param("assetId") assetId: string,
  ): Promise<AssetDetailsResponseDto> {
    return this.api.getAssetDetails(assetId);
  }
}
