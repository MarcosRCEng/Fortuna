import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { expect } from "vitest";
import { AppModule } from "../src/app.module.js";

export interface HttpResponse<T> {
  status: number;
  headers: Headers;
  body: T;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    correlationId?: string;
    timestamp?: string;
  };
}

export async function readJson<T>(
  response: Response,
): Promise<HttpResponse<T>> {
  const text = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    body: JSON.parse(text || "null") as T,
  };
}

export async function createTestApp(): Promise<{
  app: INestApplication;
  baseUrl: string;
}> {
  process.env.MARKET_DATA_ALLOW_REAL_DATA = "false";
  process.env.BRAPI_MAX_SYMBOLS_PER_REQUEST ??= "2";
  process.env.BRAPI_CACHE_TTL_SECONDS ??= "900";

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.listen(0);
  const address = app.getHttpServer().address();
  const port =
    typeof address === "object" && address !== null ? address.port : 0;
  return { app, baseUrl: `http://127.0.0.1:${port}` };
}

export async function closeTestApp(app: INestApplication): Promise<void> {
  await app.close();
}

export function expectApiError(
  response: HttpResponse<ApiErrorBody>,
  expected: { status: number; code: string },
): ApiErrorBody["error"] {
  expect(response.status).toBe(expected.status);
  expect(response.body.error.code).toBe(expected.code);
  expect(response.body.error.message).toEqual(expect.any(String));
  if (response.body.error.correlationId !== undefined) {
    expect(response.body.error.correlationId).toEqual(expect.any(String));
  }
  return response.body.error;
}
