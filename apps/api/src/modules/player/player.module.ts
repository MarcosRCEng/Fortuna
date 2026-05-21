import { Module } from "@nestjs/common";
import { PlayerApiService } from "./player-api.service.js";
import { PlayerController } from "./player.controller.js";

@Module({
  controllers: [PlayerController],
  providers: [PlayerApiService],
  exports: [PlayerApiService],
})
export class PlayerModule {}
