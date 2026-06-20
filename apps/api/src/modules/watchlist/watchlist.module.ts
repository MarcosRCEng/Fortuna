import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infra/database/database.module.js";
import { PrismaService } from "../../infra/database/prisma.service.js";
import { AuthModule } from "../auth/auth.module.js";
import { WatchlistApiService } from "./watchlist-api.service.js";
import { WatchlistController } from "./watchlist.controller.js";

const usePrismaPersistence = process.env.FORTUNA_PERSISTENCE === "prisma";

@Module({
  imports: usePrismaPersistence ? [AuthModule, DatabaseModule] : [AuthModule],
  controllers: [WatchlistController],
  providers: [
    usePrismaPersistence
      ? {
          provide: WatchlistApiService,
          useFactory: (prisma: PrismaService) =>
            WatchlistApiService.withPrisma(prisma),
          inject: [PrismaService],
        }
      : WatchlistApiService,
  ],
  exports: [WatchlistApiService],
})
export class WatchlistModule {}
