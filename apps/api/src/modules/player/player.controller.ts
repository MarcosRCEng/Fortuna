import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
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
import {
  ApiErrorDto,
  CollectIncomeRequestDto,
  CollectIncomeResponseDto,
  CreatePlayerRequestDto,
  OrderExecutionResponseDto,
  PlayerSummaryResponseDto,
  PortfolioAllocationResponseDto,
  PortfolioResponseDto,
  PlayerResponseDto,
  TradeAssetRequestDto,
  TransactionResponseDto,
  TransactionsListResponseDto,
  WalletResponseDto,
} from "./player.dto.js";

@ApiTags("players")
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
