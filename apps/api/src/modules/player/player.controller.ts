import { Body, Controller, Get, Param, Post } from "@nestjs/common";
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
  CreatePlayerRequestDto,
  PlayerResponseDto,
  TradeAssetRequestDto,
  TransactionResponseDto,
  WalletSummaryResponseDto,
} from "./player.dto.js";

@ApiTags("players")
@Controller(["api/v1/players", "players"])
export class PlayerController {
  constructor(private readonly api: PlayerApiService) {}

  @Post()
  @ApiOperation({ summary: "Criar jogador inicial do MVP." })
  @ApiCreatedResponse({ type: PlayerResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  createPlayer(
    @Body() request: CreatePlayerRequestDto,
  ): Promise<PlayerResponseDto> {
    return this.api.createPlayer(request);
  }

  @Get(":playerId/wallet")
  @ApiOperation({
    summary: "Consultar saldo, patrimonio e posicoes da carteira.",
    description:
      "Retorna apenas valores monetarios em centavos inteiros. 1 moeda Fortuna = R$ 0,01.",
  })
  @ApiOkResponse({ type: WalletSummaryResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  getWallet(
    @Param("playerId") playerId: string,
  ): Promise<WalletSummaryResponseDto> {
    return this.api.getWallet(playerId);
  }

  @Post(":playerId/buy")
  @ApiOperation({
    summary: "Comprar ativo usando apenas saldo disponivel em centavos.",
    description:
      "Executa compra simulada sem alavancagem. Compra sem saldo retorna erro financeiro padronizado.",
  })
  @ApiOkResponse({ type: TransactionResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  buyAsset(
    @Param("playerId") playerId: string,
    @Body() request: TradeAssetRequestDto,
  ): Promise<TransactionResponseDto> {
    return this.api.buyAsset(playerId, request);
  }

  @Post(":playerId/sell")
  @ApiOperation({
    summary: "Vender ativo sem permitir venda acima da posicao.",
    description:
      "Executa venda simulada somente quando a carteira possui quantidade inteira suficiente.",
  })
  @ApiOkResponse({ type: TransactionResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  sellAsset(
    @Param("playerId") playerId: string,
    @Body() request: TradeAssetRequestDto,
  ): Promise<TransactionResponseDto> {
    return this.api.sellAsset(playerId, request);
  }

  @Post(":playerId/incomes/:incomeEventId/collect")
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
    return this.api.collectIncome(playerId, incomeEventId);
  }

  @Get(":playerId/transactions")
  @ApiOperation({ summary: "Consultar historico financeiro do jogador." })
  @ApiOkResponse({ type: TransactionResponseDto, isArray: true })
  getTransactions(
    @Param("playerId") playerId: string,
  ): Promise<TransactionResponseDto[]> {
    return this.api.getTransactions(playerId);
  }
}
