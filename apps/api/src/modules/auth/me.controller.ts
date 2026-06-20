import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { PlayerApiService } from "../player/player-api.service.js";
import type {
  CollectIncomeRequestDto,
  TradeAssetRequestDto,
} from "../player/player.dto.js";
import {
  ApiErrorDto,
  EducationalTrendListResponseDto,
  EducationalTrendResponseDto,
  SimulateBuyAssetResponseDto,
} from "../player/player.dto.js";
import { CurrentUser } from "./current-user.decorator.js";
import { SessionAuthGuard } from "./session-auth.guard.js";
import type { AuthenticatedUser } from "./auth.types.js";

@ApiTags("me")
@UseGuards(SessionAuthGuard)
@Controller(["api/v1/me", "me"])
export class MeController {
  constructor(
    @Inject(PlayerApiService)
    private readonly players: PlayerApiService,
  ) {}

  @Get("player")
  @ApiOperation({ summary: "Consultar jogador autenticado." })
  getPlayer(@CurrentUser() user: AuthenticatedUser) {
    return this.players.getPlayer(user.playerId);
  }

  @Patch("player")
  @ApiOperation({ summary: "Atualizar dados do jogador autenticado." })
  updatePlayer(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: { nickname?: string },
  ) {
    return this.players.updatePlayerNickname(user.playerId, request.nickname);
  }

  @Get("summary")
  getSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.players.getPlayerSummary(user.playerId);
  }

  @Get("game-loop/state")
  getGameLoopState(@CurrentUser() user: AuthenticatedUser) {
    return this.players.getGameLoopState(user.playerId);
  }

  @Get("wallet")
  getWallet(@CurrentUser() user: AuthenticatedUser) {
    return this.players.getWalletResponse(user.playerId);
  }

  @Get("portfolio")
  getPortfolio(@CurrentUser() user: AuthenticatedUser) {
    return this.players.getPortfolio(user.playerId);
  }

  @Get("portfolio/allocation")
  getAllocation(@CurrentUser() user: AuthenticatedUser) {
    return this.players.getPortfolioAllocation(user.playerId);
  }

  @Post("orders/buy")
  @HttpCode(200)
  buy(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: TradeAssetRequestDto,
  ) {
    return this.players.buyAsset(user.playerId, request);
  }

  @Post("orders/buy/simulation")
  @HttpCode(200)
  @ApiOperation({
    summary: "Simular compra para o jogador autenticado.",
    description:
      "Calcula impacto financeiro em centavos inteiros sem criar transacao, alterar carteira, reservar saldo ou concluir missoes.",
  })
  @ApiOkResponse({ type: SimulateBuyAssetResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiUnauthorizedResponse({ type: ApiErrorDto })
  simulateBuy(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: TradeAssetRequestDto,
  ) {
    return this.players.simulateBuyAsset(user.playerId, request);
  }

  @Post("orders/sell")
  @HttpCode(200)
  sell(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: TradeAssetRequestDto,
  ) {
    return this.players.sellAsset(user.playerId, request);
  }

  @Get("transactions")
  getTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query("type") type?: string,
    @Query("assetId") assetId?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.players.getTransactions(user.playerId, {
      type,
      assetId,
      limit,
      offset,
    });
  }

  @Post("income/collect")
  @HttpCode(200)
  collectIncome(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: CollectIncomeRequestDto = {},
  ) {
    return this.players.collectIncome(user.playerId, request);
  }

  @Get("missions")
  getMissions(@CurrentUser() user: AuthenticatedUser) {
    return this.players.listPlayerMissions(user.playerId);
  }

  @Post("missions/initialize")
  @HttpCode(200)
  initializeMissions(@CurrentUser() user: AuthenticatedUser) {
    return this.players.initializePlayerMissions(user.playerId);
  }

  @Post("assets/:assetId/education-viewed")
  @HttpCode(200)
  viewAssetEducation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("assetId") assetId: string,
  ) {
    return this.players.viewAssetEducation(user.playerId, assetId);
  }

  @Get("city")
  getCity(@CurrentUser() user: AuthenticatedUser) {
    return this.players.getCityState(user.playerId);
  }

  @Get("mentor/messages")
  getMentorMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Query("limit") limit?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    return this.players.listMentorMessages(user.playerId, parsedLimit);
  }

  @Get("mentor/latest")
  getLatestMentorMessage(@CurrentUser() user: AuthenticatedUser) {
    return this.players.getLatestMentorMessage(user.playerId);
  }

  @Get("mentor/educational-trends")
  @ApiOperation({
    summary: "Listar tendencias educacionais do Fortuna para ativos.",
    description:
      "Calcula sinais deterministicos por ativo usando dados de mercado e contexto da carteira do jogador autenticado.",
  })
  @ApiOkResponse({ type: EducationalTrendListResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiUnauthorizedResponse({ type: ApiErrorDto })
  getEducationalTrends(
    @CurrentUser() user: AuthenticatedUser,
    @Query("symbols") symbols?: string,
  ) {
    return this.players.getEducationalTrends(user.playerId, symbols);
  }

  @Get("mentor/educational-trends/:symbol")
  @ApiOperation({
    summary: "Obter tendencia educacional do Fortuna para um ativo.",
    description:
      "Nao usa IA generativa, consenso externo ou promessa de desempenho.",
  })
  @ApiOkResponse({ type: EducationalTrendResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiUnauthorizedResponse({ type: ApiErrorDto })
  getEducationalTrend(
    @CurrentUser() user: AuthenticatedUser,
    @Param("symbol") symbol: string,
  ) {
    return this.players.getEducationalTrend(user.playerId, symbol);
  }

  @Post("mentor/messages/:messageId/read")
  @HttpCode(200)
  async markMentorMessageAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param("messageId") messageId: string,
  ): Promise<{ ok: true }> {
    await this.players.markMentorMessageAsRead(user.playerId, messageId);
    return { ok: true };
  }
}
