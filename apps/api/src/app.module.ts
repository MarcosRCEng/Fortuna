import { MiddlewareConsumer, Module, NestModule, ValidationPipe } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { ApiExceptionFilter } from "./infra/errors/api-exception.filter.js";
import { CorrelationIdMiddleware } from "./common/logging/correlation-id.middleware.js";
import { LoggingInterceptor } from "./common/logging/logging.interceptor.js";
import { LoggingModule } from "./common/logging/logging.module.js";
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
    LoggingModule,
    HealthModule,
    WalletModule,
    AssetsModule,
    MarketModule,
    TransactionsModule,
    MissionsModule,
    ProgressionModule,
    MentorModule,
    PlayerModule
  ],
  providers: [
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          forbidUnknownValues: true,
        }),
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes("*");
  }
}
