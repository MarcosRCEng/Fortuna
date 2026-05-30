import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { PrismaService } from "../../infra/database/prisma.service.js";
import { PlayerApiService } from "../player/player-api.service.js";
import { readAuthConfig } from "./auth.config.js";
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
  GoogleProfile,
} from "./auth.types.js";

type SessionRecord = {
  id: string;
  userId: string;
  refreshHash: string;
  expiresAt: Date;
  revokedAt?: Date;
};

type UserRecord = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  googleSubject: string;
  isActive: boolean;
  playerId: string;
  playerNickname?: string;
};

@Injectable()
export class AuthService {
  private readonly config = readAuthConfig();
  private readonly memoryUsersByGoogleSubject = new Map<string, UserRecord>();
  private readonly memoryUsersById = new Map<string, UserRecord>();
  private readonly memorySessions = new Map<string, SessionRecord>();

  constructor(
    @Inject(PlayerApiService)
    private readonly players: PlayerApiService,
    @Optional()
    @Inject("PRISMA_SERVICE")
    private readonly prisma?: PrismaService,
  ) {}

  buildGoogleAuthorizationUrl(): string {
    const { url } = this.buildGoogleAuthorizationRequest();
    return url;
  }

  buildGoogleAuthorizationRequest(): { url: string; state: string; expiresAt: Date } {
    if (!this.config.googleClientId) {
      throw new BadRequestException("GOOGLE_CLIENT_ID nao configurado.");
    }

    const state = randomBytes(32).toString("base64url");
    const params = new URLSearchParams({
      client_id: this.config.googleClientId,
      redirect_uri: this.config.googleCallbackUrl,
      response_type: "code",
      scope: "openid email profile",
      prompt: "select_account",
      state,
    });
    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      state,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    };
  }

  async exchangeGoogleCode(code: string): Promise<GoogleProfile> {
    if (!this.config.googleClientId || !this.config.googleClientSecret) {
      throw new BadRequestException("Credenciais Google OAuth nao configuradas.");
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.config.googleClientId,
        client_secret: this.config.googleClientSecret,
        redirect_uri: this.config.googleCallbackUrl,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      throw new UnauthorizedException("Google OAuth recusou o codigo informado.");
    }

    const tokenBody = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenBody.access_token) {
      throw new UnauthorizedException("Google OAuth nao retornou access token.");
    }

    const profileResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenBody.access_token}` },
      },
    );

    if (!profileResponse.ok) {
      throw new UnauthorizedException("Nao foi possivel consultar perfil Google.");
    }

    const profile = (await profileResponse.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };
    return this.normalizeGoogleProfile(profile);
  }

  async validateGoogleUser(profile: GoogleProfile): Promise<UserRecord> {
    if (!profile.emailVerified) {
      throw new UnauthorizedException("Email Google nao verificado.");
    }
    return this.findOrCreateUserFromGoogle(profile);
  }

  async createSession(
    user: UserRecord,
    request: AuthenticatedRequest,
  ): Promise<{ token: string; expiresAt: Date }> {
    const sessionId = randomUUID();
    const tokenSecret = randomBytes(32).toString("base64url");
    const expiresAt = new Date(
      Date.now() + this.config.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    );
    const refreshHash = this.hashSessionToken(sessionId, tokenSecret);

    if (this.prisma) {
      await this.prisma.userSession.create({
        data: {
          id: sessionId,
          userId: user.id,
          refreshHash,
          userAgent: this.header(request, "user-agent"),
          ipAddress: request.ip,
          expiresAt,
        },
      });
    } else {
      this.memorySessions.set(sessionId, {
        id: sessionId,
        userId: user.id,
        refreshHash,
        expiresAt,
      });
    }

    return { token: `${sessionId}.${tokenSecret}`, expiresAt };
  }

  async authenticateRequest(
    request: AuthenticatedRequest,
  ): Promise<AuthenticatedUser | undefined> {
    const token = this.readCookie(request, this.config.cookieName);
    if (!token) {
      return undefined;
    }

    const [sessionId, tokenSecret] = token.split(".");
    if (!sessionId || !tokenSecret) {
      return undefined;
    }

    const expectedHash = this.hashSessionToken(sessionId, tokenSecret);
    const session = await this.findActiveSession(sessionId);
    if (!session || !this.hashesMatch(session.refreshHash, expectedHash)) {
      return undefined;
    }

    const user = await this.findUserById(session.userId);
    if (!user) {
      return undefined;
    }
    if (!user.isActive) {
      return undefined;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      playerId: user.playerId,
      playerNickname: user.playerNickname,
      sessionId,
    };
  }

  async renewSession(
    user: AuthenticatedUser,
    request: AuthenticatedRequest,
  ): Promise<{ token: string; expiresAt: Date }> {
    await this.revokeSession(user.sessionId);
    return this.createSession(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        googleSubject: "",
        isActive: true,
        playerId: user.playerId,
        playerNickname: user.playerNickname,
      },
      request,
    );
  }

  async revokeSession(sessionId: string): Promise<void> {
    if (this.prisma) {
      await this.prisma.userSession.updateMany({
        where: { id: sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return;
    }

    const session = this.memorySessions.get(sessionId);
    if (session) {
      session.revokedAt = new Date();
    }
  }

  cookieHeader(token: string, expiresAt: Date): string {
    return this.serializeCookie(this.config.cookieName, token, {
      expiresAt,
      httpOnly: true,
    });
  }

  oauthStateCookieHeader(state: string, expiresAt: Date): string {
    return this.serializeCookie("fortuna_oauth_state", state, {
      expiresAt,
      httpOnly: true,
    });
  }

  clearOAuthStateCookieHeader(): string {
    return this.serializeCookie("fortuna_oauth_state", "", {
      expiresAt: new Date(0),
      httpOnly: true,
    });
  }

  validateOAuthState(
    request: AuthenticatedRequest,
    receivedState?: string,
  ): boolean {
    if (!receivedState) {
      return false;
    }
    const storedState = this.readCookie(request, "fortuna_oauth_state");
    if (!storedState) {
      return false;
    }
    return this.hashesMatch(storedState, receivedState);
  }

  clearCookieHeader(): string {
    return this.serializeCookie(this.config.cookieName, "", {
      expiresAt: new Date(0),
      httpOnly: true,
    });
  }

  webAppRedirect(path = "/"): string {
    return new URL(path, this.config.webAppUrl).toString();
  }

  private async findOrCreateUserFromGoogle(
    profile: GoogleProfile,
  ): Promise<UserRecord> {
    if (this.prisma) {
      const { user, player } = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.upsert({
          where: { googleSubject: profile.subject },
          update: {
            email: profile.email,
            name: profile.name,
            avatarUrl: profile.avatarUrl,
            lastLoginAt: new Date(),
          },
          create: {
            email: profile.email,
            name: profile.name,
            avatarUrl: profile.avatarUrl,
            googleSubject: profile.subject,
            lastLoginAt: new Date(),
          },
          include: { player: true },
        });
        if (!user.isActive) {
          throw new UnauthorizedException("Usuario inativo.");
        }

        if (user.player) {
          return { user, player: user.player };
        }

        const playerId = `player-${user.id}`;
        const now = new Date();
        const player = await tx.player.create({
          data: {
            id: playerId,
            userId: user.id,
            name: profile.name ?? profile.email,
            nickname: null,
          },
        });
        const walletId = `wallet-${playerId}`;
        await tx.wallet.create({
          data: {
            id: walletId,
            playerId,
            availableBalanceCents: 20_000,
          },
        });
        await tx.cityState.create({
          data: {
            id: `city-${playerId}`,
            playerId,
            unlockedBuildings: {
              version: 1,
              playerProgress: {
                playerId,
                level: 1,
                experiencePoints: 0,
                completedMissionIds: [],
                rewardedMissionIds: [],
                grantedBadges: [],
                unlockedDistricts: ["CENTRO_FINANCEIRO"],
                unlockedAssetClasses: ["CASH"],
                unlockedTools: ["WALLET_SUMMARY"],
                unlockedReports: [],
                seenEventTypes: [],
                netWorthMilestonesReachedCents: [],
                marketCyclesAdvanced: 0,
                updatedAt: now.toISOString(),
              },
            },
          },
        });
        await tx.transaction.create({
          data: {
            id: randomUUID(),
            playerId,
            walletId,
            transactionType: "INITIAL_DEPOSIT",
            status: "CONFIRMED",
            grossAmountCents: 20_000,
            feesCents: 0,
            netAmountCents: 20_000,
            balanceBeforeCents: 0,
            balanceAfterCents: 20_000,
            occurredAt: now,
          },
        });
        await tx.gameEvent.create({
          data: {
            id: randomUUID(),
            playerId,
            eventType: "PLAYER_CREATED",
            eventPayload: { source: "GOOGLE_AUTH" },
            occurredAt: now,
          },
        });
        return { user, player };
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
        googleSubject: user.googleSubject,
        isActive: user.isActive,
        playerId: player.id,
        playerNickname: player.nickname ?? undefined,
      };
    }

    const existing = this.memoryUsersByGoogleSubject.get(profile.subject);
    if (existing) {
      return existing;
    }

    const id = randomUUID();
    const player = await this.players.createPlayer({
      id: `player-${id}`,
      name: profile.name ?? profile.email,
      nickname: profile.name,
      initialBalanceCents: 20_000,
    });
    const user: UserRecord = {
      id,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      googleSubject: profile.subject,
      isActive: true,
      playerId: player.id,
      playerNickname: player.nickname,
    };
    this.memoryUsersByGoogleSubject.set(profile.subject, user);
    this.memoryUsersById.set(user.id, user);
    return user;
  }

  private async findActiveSession(
    sessionId: string,
  ): Promise<SessionRecord | undefined> {
    const now = new Date();
    if (this.prisma) {
      const session = await this.prisma.userSession.findFirst({
        where: {
          id: sessionId,
          revokedAt: null,
          expiresAt: { gt: now },
        },
      });
      return session
        ? {
            id: session.id,
            userId: session.userId,
            refreshHash: session.refreshHash,
            expiresAt: session.expiresAt,
            revokedAt: session.revokedAt ?? undefined,
          }
        : undefined;
    }

    const session = this.memorySessions.get(sessionId);
    if (!session || session.revokedAt || session.expiresAt <= now) {
      return undefined;
    }
    return session;
  }

  private async findUserById(userId: string): Promise<UserRecord | undefined> {
    if (this.prisma) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { player: true },
      });
      if (!user?.player) {
        return undefined;
      }
      if (!user.isActive) {
        return undefined;
      }
      return {
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
        googleSubject: user.googleSubject,
        isActive: user.isActive,
        playerId: user.player.id,
        playerNickname: user.player.nickname ?? undefined,
      };
    }

    return this.memoryUsersById.get(userId);
  }

  private normalizeGoogleProfile(profile: {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
    email_verified?: boolean;
  }): GoogleProfile {
    if (!profile.sub || !profile.email) {
      throw new UnauthorizedException("Perfil Google sem email ou subject.");
    }
    if (profile.email_verified !== true) {
      throw new UnauthorizedException("Email Google nao verificado.");
    }

    return {
      subject: profile.sub,
      email: profile.email.toLowerCase(),
      emailVerified: profile.email_verified,
      name: profile.name,
      avatarUrl: profile.picture,
    };
  }

  private hashSessionToken(sessionId: string, tokenSecret: string): string {
    return createHash("sha256")
      .update(`${sessionId}.${tokenSecret}.${this.config.refreshTokenSecret}`)
      .digest("hex");
  }

  private hashesMatch(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  }

  private readCookie(request: AuthenticatedRequest, name: string): string | undefined {
    const cookieHeader = this.header(request, "cookie");
    if (!cookieHeader) {
      return undefined;
    }

    for (const part of cookieHeader.split(";")) {
      const [rawKey, ...rawValue] = part.trim().split("=");
      if (rawKey === name) {
        return decodeURIComponent(rawValue.join("="));
      }
    }
    return undefined;
  }

  private header(
    request: AuthenticatedRequest,
    name: string,
  ): string | undefined {
    const value = request.headers[name] ?? request.headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  }

  private serializeCookie(
    name: string,
    value: string,
    options: { expiresAt: Date; httpOnly: boolean },
  ): string {
    const parts = [
      `${name}=${encodeURIComponent(value)}`,
      "Path=/",
      `Expires=${options.expiresAt.toUTCString()}`,
      `Max-Age=${Math.max(0, Math.floor((options.expiresAt.getTime() - Date.now()) / 1000))}`,
      `SameSite=${this.config.cookieSameSite}`,
    ];
    if (options.httpOnly) {
      parts.push("HttpOnly");
    }
    if (this.config.cookieSecure) {
      parts.push("Secure");
    }
    return parts.join("; ");
  }
}
