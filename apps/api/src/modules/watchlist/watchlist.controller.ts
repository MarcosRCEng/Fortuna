import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { WatchlistApiService } from "./watchlist-api.service.js";
import type {
  AddWatchlistItemRequestDto,
  ReorderWatchlistItemsRequestDto,
  UpdateWatchlistPreferencesRequestDto,
} from "./watchlist.dto.js";

@ApiTags("me")
@UseGuards(SessionAuthGuard)
@Controller(["api/v1/me/watchlist", "me/watchlist"])
export class WatchlistController {
  constructor(
    @Inject(WatchlistApiService)
    private readonly watchlists: WatchlistApiService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Consultar watchlist do jogador autenticado." })
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.watchlists.get(user.playerId);
  }

  @Post("items")
  @HttpCode(200)
  @ApiOperation({ summary: "Adicionar ativo na watchlist autenticada." })
  addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: AddWatchlistItemRequestDto,
  ) {
    return this.watchlists.addItem(user.playerId, request);
  }

  @Delete("items/:symbol")
  @HttpCode(200)
  @ApiOperation({ summary: "Remover ativo da watchlist autenticada." })
  removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param("symbol") symbol: string,
  ) {
    return this.watchlists.removeItem(user.playerId, symbol);
  }

  @Put("items/order")
  @HttpCode(200)
  @ApiOperation({ summary: "Reordenar ativos da watchlist autenticada." })
  reorderItems(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: ReorderWatchlistItemsRequestDto,
  ) {
    return this.watchlists.reorderItems(user.playerId, request);
  }

  @Patch("preferences")
  @HttpCode(200)
  @ApiOperation({ summary: "Atualizar preferencias da watchlist autenticada." })
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: UpdateWatchlistPreferencesRequestDto,
  ) {
    return this.watchlists.updatePreferences(user.playerId, request);
  }
}
