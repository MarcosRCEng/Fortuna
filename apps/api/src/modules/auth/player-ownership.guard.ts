import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
  forwardRef,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "./auth.types.js";
import { AuthService } from "./auth.service.js";

@Injectable()
export class PlayerOwnershipGuard implements CanActivate {
  constructor(
    @Inject(forwardRef(() => AuthService))
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      AuthenticatedRequest & { params?: Record<string, string | undefined> }
    >();
    const playerId = request.params?.playerId;
    if (!playerId) {
      return true;
    }
    const user = await this.auth.authenticateRequest(request);
    if (!user) {
      if (process.env.FORTUNA_PERSISTENCE !== "prisma") {
        return true;
      }
      throw new UnauthorizedException("Sessao invalida ou expirada.");
    }
    request.user = user;
    if (user.playerId !== playerId) {
      throw new ForbiddenException("Jogador nao pertence a sessao atual.");
    }
    return true;
  }
}
