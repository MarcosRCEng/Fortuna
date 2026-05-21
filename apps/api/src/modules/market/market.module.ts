import { Module } from "@nestjs/common";
import { PlayerModule } from "../player/player.module.js";
import { MarketController } from "./market.controller.js";

@Module({
  imports: [PlayerModule],
  controllers: [MarketController],
})
export class MarketModule {}
