import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PlayerModule } from "../player/player.module.js";
import { WatchlistModule } from "../watchlist/watchlist.module.js";
import { MarketController } from "./market.controller.js";
import { MarketAssetDetailService } from "./market-asset-detail.service.js";

@Module({
  imports: [AuthModule, PlayerModule, WatchlistModule],
  controllers: [MarketController],
  providers: [MarketAssetDetailService],
})
export class MarketModule {}
