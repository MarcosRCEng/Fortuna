import { Module } from "@nestjs/common";
import { AssetsModule } from "./modules/assets/assets.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { MarketModule } from "./modules/market/market.module.js";
import { MentorModule } from "./modules/mentor/mentor.module.js";
import { MissionsModule } from "./modules/missions/missions.module.js";
import { PlayerModule } from "./modules/player/player.module.js";
import { ProgressionModule } from "./modules/progression/progression.module.js";
import { TransactionsModule } from "./modules/transactions/transactions.module.js";
import { WalletModule } from "./modules/wallet/wallet.module.js";

@Module({
  imports: [
    HealthModule,
    WalletModule,
    AssetsModule,
    MarketModule,
    TransactionsModule,
    MissionsModule,
    ProgressionModule,
    MentorModule,
    PlayerModule
  ]
})
export class AppModule {}
