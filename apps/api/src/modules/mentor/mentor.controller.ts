import { Controller, Get, Param, Post } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { ApiErrorDto, MentorTipResponseDto } from "../player/player.dto.js";
import { PlayerApiService } from "../player/player-api.service.js";

@ApiTags("mentor")
@Controller(["api/v1/mentor", "mentor"])
export class MentorController {
  constructor(private readonly api: PlayerApiService) {}

  @Get("tips/player/:playerId")
  @ApiOperation({
    summary: "Listar dicas educativas disponiveis para o jogador.",
    description:
      "Avalia regras deterministicas do Mentor Fortuna a partir da carteira simulada do jogador.",
  })
  @ApiOkResponse({ type: MentorTipResponseDto, isArray: true })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  getTips(
    @Param("playerId") playerId: string,
  ): Promise<MentorTipResponseDto[]> {
    return this.api.evaluateMentorTips(playerId);
  }

  @Post("evaluate/player/:playerId")
  @ApiOperation({
    summary: "Avaliar regras deterministicas do Mentor Fortuna para o jogador.",
    description:
      "Gera dicas educativas deterministicas; nao usa IA generativa nesta sprint.",
  })
  @ApiOkResponse({ type: MentorTipResponseDto, isArray: true })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  evaluate(
    @Param("playerId") playerId: string,
  ): Promise<MentorTipResponseDto[]> {
    return this.api.evaluateMentorTips(playerId);
  }
}
