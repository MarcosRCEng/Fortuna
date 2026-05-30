import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infra/database/database.module.js";
import { PrismaService } from "../../infra/database/prisma.service.js";
import { PlayerModule } from "../player/player.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { MeController } from "./me.controller.js";
import { SessionAuthGuard } from "./session-auth.guard.js";

const usePrismaPersistence = process.env.FORTUNA_PERSISTENCE === "prisma";

@Module({
  imports: usePrismaPersistence ? [PlayerModule, DatabaseModule] : [PlayerModule],
  controllers: [AuthController, MeController],
  providers: [
    AuthService,
    SessionAuthGuard,
    ...(usePrismaPersistence
      ? [{ provide: "PRISMA_SERVICE", useExisting: PrismaService }]
      : []),
  ],
  exports: [AuthService, SessionAuthGuard],
})
export class AuthModule {}

