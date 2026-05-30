import { Module, forwardRef } from "@nestjs/common";
import { DatabaseModule } from "../../infra/database/database.module.js";
import { PrismaService } from "../../infra/database/prisma.service.js";
import { AuthModule } from "../auth/auth.module.js";
import { PlayerApiService } from "./player-api.service.js";
import { PlayerController } from "./player.controller.js";

const usePrismaPersistence = process.env.FORTUNA_PERSISTENCE === "prisma";

@Module({
  imports: usePrismaPersistence
    ? [DatabaseModule, forwardRef(() => AuthModule)]
    : [forwardRef(() => AuthModule)],
  controllers: [PlayerController],
  providers: [
    usePrismaPersistence
      ? {
          provide: PlayerApiService,
          useFactory: (prisma: PrismaService) =>
            PlayerApiService.withPrisma(prisma),
          inject: [PrismaService],
        }
      : PlayerApiService,
  ],
  exports: [PlayerApiService],
})
export class PlayerModule {}
