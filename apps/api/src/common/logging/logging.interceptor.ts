import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, catchError, tap, throwError } from "rxjs";
import { RequestContextService } from "./request-context.service.js";
import { StructuredLoggerService } from "./logger.service.js";

interface HttpRequestInfo {
  method: string;
  url: string;
  originalUrl?: string;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger?: StructuredLoggerService,
    private readonly requestContext?: RequestContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<HttpRequestInfo>();
    const startedAt = Date.now();
    const logger =
      this.logger ?? new StructuredLoggerService(new RequestContextService());
    const correlationId =
      this.requestContext?.getCorrelationId() ??
      RequestContextService.getCorrelationId();
    const route = `${request.method} ${request.originalUrl ?? request.url}`;

    logger.info({
      context: "http",
      message: "HTTP request received",
      correlationId,
      operation: route,
      metadata: {
        method: request.method,
        path: request.originalUrl ?? request.url,
      },
    });

    return next.handle().pipe(
      tap(() => {
        logger.info({
          context: "http",
          message: "HTTP request completed",
          correlationId,
          operation: route,
          durationMs: Date.now() - startedAt,
        });
      }),
      catchError((error: unknown) => {
        logger.error({
          context: "http",
          message: "HTTP request failed",
          correlationId,
          operation: route,
          durationMs: Date.now() - startedAt,
          error,
        });
        return throwError(() => error);
      }),
    );
  }
}
