import { Module } from "@nestjs/common";
import { PlayerModule } from "../player/player.module.js";
import { MentorController } from "./mentor.controller.js";

@Module({
  imports: [PlayerModule],
  controllers: [MentorController],
})
export class MentorModule {}
