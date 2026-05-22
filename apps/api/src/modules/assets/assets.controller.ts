import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PlayerApiService } from "../player/player-api.service.js";
import { AssetResponseDto } from "../player/player.dto.js";

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
}
