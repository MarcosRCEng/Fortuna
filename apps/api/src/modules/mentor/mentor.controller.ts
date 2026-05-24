import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import {
  ApiErrorDto,
  MentorLatestMessageResponseDto,
  MentorMessageListResponseDto,
  MentorTipResponseDto,
} from "../player/player.dto.js";
import { PlayerApiService } from "../player/player-api.service.js";

@ApiTags("mentor")
@Controller(["api/v1/mentor", "mentor"])
export class MentorController {
  constructor(private readonly api: PlayerApiService) {}

  @Get("/players/:playerId/mentor/messages")
  @ApiOperation({
    summary: "Listar historico de mensagens do Mentor Fortuna.",
    description:
      "Retorna mensagens educativas persistidas, geradas por regras deterministicas e seguras para o MVP.",
  })
  @ApiOkResponse({ type: MentorMessageListResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  getMessages(
    @Param("playerId") playerId: string,
    @Query("limit") limit?: string,
  ): Promise<MentorMessageListResponseDto> {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    return this.api.listMentorMessages(playerId, parsedLimit);
  }

  @Get("/players/:playerId/mentor/latest")
  @ApiOperation({
    summary: "Obter mensagem mais relevante do Mentor para o dashboard.",
  })
  @ApiOkResponse({ type: MentorLatestMessageResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  getLatest(
    @Param("playerId") playerId: string,
  ): Promise<MentorLatestMessageResponseDto> {
    return this.api.getLatestMentorMessage(playerId);
  }

  @Post("/players/:playerId/mentor/messages/:messageId/read")
  @ApiOperation({
    summary: "Marcar mensagem do Mentor como lida.",
  })
  @ApiOkResponse({ schema: { example: { ok: true } } })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  async markAsRead(
    @Param("playerId") playerId: string,
    @Param("messageId") messageId: string,
  ): Promise<{ ok: true }> {
    await this.api.markMentorMessageAsRead(playerId, messageId);
    return { ok: true };
  }

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
