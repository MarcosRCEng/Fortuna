import { Injectable } from "@nestjs/common";
import { AsyncLocalStorage } from "node:async_hooks";

interface RequestContext {
  correlationId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

@Injectable()
export class RequestContextService {
  run<T>(correlationId: string, callback: () => T): T {
    return storage.run({ correlationId }, callback);
  }

  getCorrelationId(): string | undefined {
    return RequestContextService.getCorrelationId();
  }

  static getCorrelationId(): string | undefined {
    return storage.getStore()?.correlationId;
  }

  static run<T>(correlationId: string, callback: () => T): T {
    return storage.run({ correlationId }, callback);
  }
}
