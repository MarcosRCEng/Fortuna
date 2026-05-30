import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service.js";

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = await this.auth.authenticateRequest(request);
    if (!user) {
      throw new UnauthorizedException("Sessao invalida ou expirada.");
    }

    request.user = user;
    return true;
  }
}

