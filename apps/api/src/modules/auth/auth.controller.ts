import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Logger,
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
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly auth: AuthService) {}

  @Get("google")
  @ApiOperation({ summary: "Iniciar login com Google OAuth." })
  google(@Res() response: ResponseLike): void {
    let authorization: { url: string; state: string; expiresAt: Date };
    try {
      authorization = this.auth.buildGoogleAuthorizationRequest();
    } catch (caught) {
      this.logger.warn(`Google OAuth preflight failed: ${this.safeErrorMessage(caught)}`);
      response.redirect(this.auth.webAppRedirect(this.googleAuthErrorPath(caught)));
      return;
    }

    response.setHeader(
      "Set-Cookie",
      this.auth.oauthStateCookieHeader(authorization.state, authorization.expiresAt),
    );
    response.redirect(authorization.url);
  }

  @Get("google/callback")
  @ApiOperation({ summary: "Receber callback Google e criar sessao." })
  async googleCallback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Req() request: AuthenticatedRequest,
    @Res() response: ResponseLike,
  ): Promise<void> {
    const clearStateCookie = this.auth.clearOAuthStateCookieHeader();
    if (!code || !this.auth.validateOAuthState(request, state)) {
      response.setHeader("Set-Cookie", clearStateCookie);
      response.redirect(this.auth.webAppRedirect("/login?error=google_auth_failed"));
      return;
    }

    try {
      const profile = await this.auth.exchangeGoogleCode(code);
      const user = await this.auth.validateGoogleUser(profile);
      const session = await this.auth.createSession(user, request);
      response.setHeader("Set-Cookie", [
        this.auth.cookieHeader(session.token, session.expiresAt),
        clearStateCookie,
      ]);
      response.redirect(this.auth.webAppRedirect("/"));
    } catch (caught) {
      this.logger.warn(`Google OAuth callback failed: ${this.safeErrorMessage(caught)}`);
      response.setHeader("Set-Cookie", clearStateCookie);
      response.redirect(this.auth.webAppRedirect(this.googleAuthErrorPath(caught)));
    }
  }

  @Get("dev-login")
  @ApiOperation({ summary: "Criar sessao local de desenvolvimento." })
  async devLogin(
    @Req() request: AuthenticatedRequest,
    @Res() response: ResponseLike,
  ): Promise<void> {
    if (!this.auth.isDevelopmentLoginEnabled()) {
      response.redirect(this.auth.webAppRedirect("/login?error=dev_login_disabled"));
      return;
    }

    const user = await this.auth.createDevelopmentUser();
    const session = await this.auth.createSession(user, request);
    response.setHeader(
      "Set-Cookie",
      this.auth.cookieHeader(session.token, session.expiresAt),
    );
    response.redirect(this.auth.webAppRedirect("/city"));
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
        nickname: user.playerNickname,
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

  @Post("session/renew")
  @UseGuards(SessionAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: "Renovar sessao persistente atual." })
  async renewSession(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: ResponseLike,
  ) {
    const session = await this.auth.renewSession(user, request);
    response.setHeader("Set-Cookie", this.auth.cookieHeader(session.token, session.expiresAt));
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      player: {
        id: user.playerId,
        nickname: user.playerNickname,
      },
    };
  }

  @Post("refresh")
  @UseGuards(SessionAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: "Rota legada: renova a sessao persistente atual." })
  refresh(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: ResponseLike,
  ) {
    return this.renewSession(user, request, response);
  }

  private googleAuthErrorPath(caught: unknown): string {
    const message = this.safeErrorMessage(caught);
    if (message.includes("GOOGLE_CLIENT_ID nao configurado")) {
      return "/login?error=google_client_id_missing";
    }
    if (message.includes("Credenciais Google OAuth nao configuradas")) {
      return "/login?error=google_oauth_credentials";
    }
    if (message.includes("Google OAuth recusou o codigo informado")) {
      return "/login?error=google_token_exchange_failed";
    }
    if (message.includes("Google OAuth nao retornou access token")) {
      return "/login?error=google_token_exchange_failed";
    }
    if (message.includes("Nao foi possivel consultar perfil Google")) {
      return "/login?error=google_profile_failed";
    }
    if (message.includes("Email Google nao verificado")) {
      return "/login?error=google_email_unverified";
    }
    return "/login?error=google_auth_failed";
  }

  private safeErrorMessage(caught: unknown): string {
    if (caught instanceof BadRequestException) {
      const response = caught.getResponse();
      if (typeof response === "object" && response && "message" in response) {
        const message = (response as { message?: unknown }).message;
        return Array.isArray(message) ? message.join(" ") : String(message);
      }
    }
    return caught instanceof Error ? caught.message : String(caught);
  }
}
