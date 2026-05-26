import { Global, Module } from "@nestjs/common";
import { CorrelationIdMiddleware } from "./correlation-id.middleware.js";
import { StructuredLoggerService } from "./logger.service.js";
import { RequestContextService } from "./request-context.service.js";

@Global()
@Module({
  providers: [
    RequestContextService,
    StructuredLoggerService,
    CorrelationIdMiddleware,
  ],
  exports: [
    RequestContextService,
    StructuredLoggerService,
    CorrelationIdMiddleware,
  ],
})
export class LoggingModule {}
