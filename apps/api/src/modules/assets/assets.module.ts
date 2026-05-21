import { Module } from "@nestjs/common";
import { PlayerModule } from "../player/player.module.js";
import { AssetsController } from "./assets.controller.js";

@Module({
  imports: [PlayerModule],
  controllers: [AssetsController],
})
export class AssetsModule {}
