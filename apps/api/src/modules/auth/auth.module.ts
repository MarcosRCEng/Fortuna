import { Module, forwardRef } from "@nestjs/common";
import { DatabaseModule } from "../../infra/database/database.module.js";
import { PrismaService } from "../../infra/database/prisma.service.js";
import { PlayerModule } from "../player/player.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { MeController } from "./me.controller.js";
import { PlayerOwnershipGuard } from "./player-ownership.guard.js";
import { SessionAuthGuard } from "./session-auth.guard.js";

const usePrismaPersistence = process.env.FORTUNA_PERSISTENCE === "prisma";

@Module({
  imports: usePrismaPersistence
    ? [forwardRef(() => PlayerModule), DatabaseModule]
    : [forwardRef(() => PlayerModule)],
  controllers: [AuthController, MeController],
  providers: [
    AuthService,
    SessionAuthGuard,
    PlayerOwnershipGuard,
    ...(usePrismaPersistence
      ? [{ provide: "PRISMA_SERVICE", useExisting: PrismaService }]
      : []),
  ],
  exports: [AuthService, SessionAuthGuard, PlayerOwnershipGuard],
})
export class AuthModule {}
