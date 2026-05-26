import { Injectable, type NestMiddleware } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { RequestContextService } from "./request-context.service.js";

interface RequestWithHeaders {
  header(name: string): string | undefined;
}

interface ResponseWithHeaders {
  setHeader(name: string, value: string): void;
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(private readonly requestContext?: RequestContextService) {}

  use(
    request: RequestWithHeaders,
    response: ResponseWithHeaders,
    next: () => void,
  ): void {
    const incoming = request.header("x-correlation-id")?.trim();
    const correlationId = incoming && incoming.length > 0 ? incoming : randomUUID();
    response.setHeader("x-correlation-id", correlationId);
    if (this.requestContext) {
      this.requestContext.run(correlationId, next);
      return;
    }

    RequestContextService.run(correlationId, next);
  }
}
