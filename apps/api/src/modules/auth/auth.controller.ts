import {
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service.js";
import { CurrentUser } from "./current-user.decorator.js";
import { SessionAuthGuard } from "./session-auth.guard.js";
import type { AuthenticatedRequest, AuthenticatedUser } from "./auth.types.js";

type ResponseLike = {
  redirect(url: string): void;
  setHeader(name: string, value: string | string[]): void;
};

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get("google")
  @ApiOperation({ summary: "Iniciar login com Google OAuth." })
  google(@Res() response: ResponseLike): void {
    response.redirect(this.auth.buildGoogleAuthorizationUrl());
  }

  @Get("google/callback")
  @ApiOperation({ summary: "Receber callback Google e criar sessao." })
  async googleCallback(
    @Query("code") code: string | undefined,
    @Req() request: AuthenticatedRequest,
    @Res() response: ResponseLike,
  ): Promise<void> {
    if (!code) {
      response.redirect(this.auth.webAppRedirect("/login?error=google"));
      return;
    }

    const profile = await this.auth.exchangeGoogleCode(code);
    const user = await this.auth.validateGoogleUser(profile);
    const session = await this.auth.createSession(user, request);
    response.setHeader("Set-Cookie", this.auth.cookieHeader(session.token, session.expiresAt));
    response.redirect(this.auth.webAppRedirect("/"));
  }

  @Get("me")
  @UseGuards(SessionAuthGuard)
  @ApiOperation({ summary: "Consultar usuario e jogador da sessao atual." })
  @ApiOkResponse({ type: Object })
  me(@CurrentUser() user: AuthenticatedUser) {
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      player: {
        id: user.playerId,
      },
    };
  }

  @Post("logout")
  @UseGuards(SessionAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: "Revogar sessao atual e limpar cookie." })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: ResponseLike,
  ): Promise<{ ok: true }> {
    await this.auth.revokeSession(user.sessionId);
    response.setHeader("Set-Cookie", this.auth.clearCookieHeader());
    return { ok: true };
  }

  @Post("refresh")
  @UseGuards(SessionAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: "Validar sessao persistente atual." })
  refresh(@CurrentUser() user: AuthenticatedUser) {
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      player: {
        id: user.playerId,
      },
    };
  }
}

