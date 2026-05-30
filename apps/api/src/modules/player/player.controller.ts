import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { PlayerApiService } from "./player-api.service.js";
import { PlayerOwnershipGuard } from "../auth/player-ownership.guard.js";
import {
  ApiErrorDto,
  CollectIncomeRequestDto,
  CollectIncomeResponseDto,
  CreatePlayerRequestDto,
  MentorLatestMessageResponseDto,
  MentorMessageListResponseDto,
  OrderExecutionResponseDto,
  PlayerGameLoopStateResponseDto,
  PlayerSummaryResponseDto,
  PortfolioAllocationResponseDto,
  PortfolioResponseDto,
  PlayerResponseDto,
  RunGameLoopTickResponseDto,
  TradeAssetRequestDto,
  TransactionResponseDto,
  TransactionsListResponseDto,
  WalletResponseDto,
} from "./player.dto.js";

@ApiTags("players")
@UseGuards(PlayerOwnershipGuard)
@Controller(["api/v1/players", "players"])
export class PlayerController {
  @Inject(PlayerApiService)
  private readonly api!: PlayerApiService;

  @Post()
  @ApiOperation({ summary: "Criar jogador inicial do MVP." })
  @ApiCreatedResponse({ type: PlayerResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  createPlayer(
    @Body() request: CreatePlayerRequestDto,
  ): Promise<PlayerResponseDto> {
    return this.api.createPlayer(request);
  }

  @Get(":playerId")
  @ApiOperation({ summary: "Consultar dados basicos de um jogador." })
  @ApiOkResponse({ type: PlayerResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  getPlayer(@Param("playerId") playerId: string): Promise<PlayerResponseDto> {
    return this.api.getPlayer(playerId);
  }

  @Get(":playerId/summary")
  @ApiOperation({ summary: "Consultar resumo financeiro do jogador." })
  @ApiOkResponse({ type: PlayerSummaryResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  getPlayerSummary(
    @Param("playerId") playerId: string,
  ): Promise<PlayerSummaryResponseDto> {
    return this.api.getPlayerSummary(playerId);
  }

  @Get(":playerId/consents")
  @ApiOperation({ summary: "Listar consentimentos educativos do jogador." })
  @ApiOkResponse({ type: Object })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  listConsents(@Param("playerId") playerId: string) {
    return this.api.listConsents(playerId);
  }

  @Post(":playerId/consents/:type/accept")
  @HttpCode(200)
  @ApiOperation({ summary: "Aceitar consentimento educativo ou futuro." })
  @ApiOkResponse({ type: Object })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  acceptConsent(
    @Param("playerId") playerId: string,
    @Param("type") type: string,
  ) {
    return this.api.acceptConsent(playerId, type);
  }

  @Post(":playerId/consents/:type/revoke")
  @HttpCode(200)
  @ApiOperation({ summary: "Revogar consentimento educativo ou futuro." })
  @ApiOkResponse({ type: Object })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  revokeConsent(
    @Param("playerId") playerId: string,
    @Param("type") type: string,
  ) {
    return this.api.revokeConsent(playerId, type);
  }

  @Get(":playerId/audit-events")
  @ApiOperation({ summary: "Listar eventos de auditoria simulada do jogador." })
  @ApiOkResponse({ type: Object })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  listAuditEvents(@Param("playerId") playerId: string) {
    return this.api.listAuditEvents(playerId);
  }

  @Get(":playerId/mentor/messages")
  @ApiOperation({ summary: "Listar historico de mensagens do Mentor Fortuna." })
  @ApiOkResponse({ type: MentorMessageListResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  listMentorMessages(
    @Param("playerId") playerId: string,
    @Query("limit") limit?: string,
  ): Promise<MentorMessageListResponseDto> {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    return this.api.listMentorMessages(playerId, parsedLimit);
  }

  @Get(":playerId/mentor/latest")
  @ApiOperation({ summary: "Obter mensagem do Mentor para o dashboard." })
  @ApiOkResponse({ type: MentorLatestMessageResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  getLatestMentorMessage(
    @Param("playerId") playerId: string,
  ): Promise<MentorLatestMessageResponseDto> {
    return this.api.getLatestMentorMessage(playerId);
  }

  @Post(":playerId/mentor/messages/:messageId/read")
  @HttpCode(200)
  @ApiOperation({ summary: "Marcar mensagem do Mentor como lida." })
  @ApiOkResponse({ schema: { example: { ok: true } } })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  async markMentorMessageAsRead(
    @Param("playerId") playerId: string,
    @Param("messageId") messageId: string,
  ): Promise<{ ok: true }> {
    await this.api.markMentorMessageAsRead(playerId, messageId);
    return { ok: true };
  }

  @Get(":playerId/game-loop/state")
  @ApiOperation({
    summary: "Consultar estado consolidado do game loop do jogador.",
    description:
      "Agrega carteira, alocacao, rendimentos, missoes, mentor, cidade e historico sem duplicar calculo financeiro no front-end.",
  })
  @ApiOkResponse({ type: PlayerGameLoopStateResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  getGameLoopState(
    @Param("playerId") playerId: string,
  ): Promise<PlayerGameLoopStateResponseDto> {
    return this.api.getGameLoopState(playerId);
  }

  @Get(":playerId/city")
  @ApiOperation({ summary: "Consultar estado atual da Cidade Fortuna." })
  @ApiOkResponse({ type: Object })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  getCityState(@Param("playerId") playerId: string) {
    return this.api.getCityState(playerId);
  }

  @Post(":playerId/game-loop/tick")
  @HttpCode(200)
  @ApiOperation({
    summary: "Executar um tick controlado do game loop.",
    description:
      "Atualiza precos mockados, reavalia carteira/progresso/cidade e retorna o estado consolidado.",
  })
  @ApiOkResponse({ type: RunGameLoopTickResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  runGameLoopTick(
    @Param("playerId") playerId: string,
  ): Promise<RunGameLoopTickResponseDto> {
    return this.api.runGameLoopTick(playerId);
  }

  @Get(":playerId/missions")
  @ApiOperation({ summary: "Listar missoes educativas do jogador." })
  @ApiOkResponse({ type: Object })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  listMissions(@Param("playerId") playerId: string) {
    return this.api.listPlayerMissions(playerId);
  }

  @Get(":playerId/missions/:missionId")
  @ApiOperation({ summary: "Consultar uma missao educativa do jogador." })
  @ApiOkResponse({ type: Object })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  getMission(
    @Param("playerId") playerId: string,
    @Param("missionId") missionId: string,
  ) {
    return this.api.getPlayerMission(playerId, missionId);
  }

  @Post(":playerId/missions/initialize")
  @HttpCode(200)
  @ApiOperation({ summary: "Inicializar missoes padrao do jogador." })
  @ApiOkResponse({ type: Object })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  initializeMissions(@Param("playerId") playerId: string) {
    return this.api.initializePlayerMissions(playerId);
  }

  @Post(":playerId/assets/:assetId/education-viewed")
  @HttpCode(200)
  @ApiOperation({
    summary: "Registrar visualizacao educativa de detalhes de ativo.",
  })
  @ApiOkResponse({ type: Object })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  viewAssetEducation(
    @Param("playerId") playerId: string,
    @Param("assetId") assetId: string,
  ) {
    return this.api.viewAssetEducation(playerId, assetId);
  }

  @Get(":playerId/wallet")
  @ApiOperation({
    summary: "Consultar saldo, patrimonio e posicoes da carteira.",
    description:
      "Retorna apenas valores monetarios em centavos inteiros. 1 moeda Fortuna = R$ 0,01.",
  })
  @ApiOkResponse({ type: WalletResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  getWallet(@Param("playerId") playerId: string): Promise<WalletResponseDto> {
    return this.api.getWalletResponse(playerId);
  }

  @Get(":playerId/portfolio")
  @ApiOperation({ summary: "Consultar posicoes do jogador." })
  @ApiOkResponse({ type: PortfolioResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  getPortfolio(
    @Param("playerId") playerId: string,
  ): Promise<PortfolioResponseDto> {
    return this.api.getPortfolio(playerId);
  }

  @Get(":playerId/portfolio/allocation")
  @ApiOperation({ summary: "Consultar alocacao da carteira por tipo e ativo." })
  @ApiOkResponse({ type: PortfolioAllocationResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  getPortfolioAllocation(
    @Param("playerId") playerId: string,
  ): Promise<PortfolioAllocationResponseDto> {
    return this.api.getPortfolioAllocation(playerId);
  }

  @Post(":playerId/orders/buy")
  @HttpCode(200)
  @ApiOperation({
    summary: "Comprar ativo usando apenas saldo disponivel em centavos.",
    description:
      "Executa compra simulada sem alavancagem. Compra sem saldo retorna erro financeiro padronizado.",
  })
  @ApiOkResponse({ type: OrderExecutionResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  buyAsset(
    @Param("playerId") playerId: string,
    @Body() request: TradeAssetRequestDto,
  ): Promise<OrderExecutionResponseDto> {
    return this.api.buyAsset(playerId, request);
  }

  @Post(":playerId/orders/sell")
  @HttpCode(200)
  @ApiOperation({
    summary: "Vender ativo sem permitir venda acima da posicao.",
    description:
      "Executa venda simulada somente quando a carteira possui quantidade inteira suficiente.",
  })
  @ApiOkResponse({ type: OrderExecutionResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  sellAsset(
    @Param("playerId") playerId: string,
    @Body() request: TradeAssetRequestDto,
  ): Promise<OrderExecutionResponseDto> {
    return this.api.sellAsset(playerId, request);
  }

  @Post(":playerId/buy")
  @HttpCode(200)
  @ApiOperation({ summary: "Comprar ativo (rota legada)." })
  @ApiOkResponse({ type: OrderExecutionResponseDto })
  buyAssetLegacy(
    @Param("playerId") playerId: string,
    @Body() request: TradeAssetRequestDto,
  ): Promise<OrderExecutionResponseDto> {
    return this.api.buyAsset(playerId, request);
  }

  @Post(":playerId/sell")
  @HttpCode(200)
  @ApiOperation({ summary: "Vender ativo (rota legada)." })
  @ApiOkResponse({ type: OrderExecutionResponseDto })
  sellAssetLegacy(
    @Param("playerId") playerId: string,
    @Body() request: TradeAssetRequestDto,
  ): Promise<OrderExecutionResponseDto> {
    return this.api.sellAsset(playerId, request);
  }

  @Post(":playerId/income/collect")
  @HttpCode(200)
  @ApiOperation({ summary: "Coletar rendimentos disponiveis do jogador." })
  @ApiOkResponse({ type: CollectIncomeResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  collectAvailableIncome(
    @Param("playerId") playerId: string,
    @Body() request: CollectIncomeRequestDto = {},
  ): Promise<CollectIncomeResponseDto> {
    return this.api.collectIncome(playerId, request);
  }

  @Post(":playerId/incomes/:incomeEventId/collect")
  @HttpCode(200)
  @ApiOperation({
    summary: "Colher rendimento mockado uma unica vez.",
    description:
      "Credita rendimento em centavos inteiros e cria uma transacao quando a coleta e valida.",
  })
  @ApiOkResponse({ type: TransactionResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  collectIncome(
    @Param("playerId") playerId: string,
    @Param("incomeEventId") incomeEventId: string,
  ): Promise<TransactionResponseDto> {
    return this.api.collectIncomeById(playerId, incomeEventId);
  }

  @Get(":playerId/transactions")
  @ApiOperation({ summary: "Consultar historico financeiro do jogador." })
  @ApiOkResponse({ type: TransactionsListResponseDto })
  getTransactions(
    @Param("playerId") playerId: string,
    @Query("type") type?: string,
    @Query("assetId") assetId?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ): Promise<TransactionsListResponseDto> {
    return this.api.getTransactions(playerId, {
      type,
      assetId,
      limit,
      offset,
    });
  }
}
