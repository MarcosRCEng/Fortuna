import { BadRequestException, HttpStatus } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import {
  InsufficientBalanceError,
  MoneyCents,
  Quantity,
} from "@fortuna/domain";
import { ApiExceptionFilter } from "../src/infra/errors/api-exception.filter.js";

function createHost(url: string) {
  let statusCode = 0;
  let body: unknown;

  return {
    host: {
      switchToHttp: () => ({
        getRequest: () => ({ url }),
        getResponse: () => ({
          status: (code: number) => {
            statusCode = code;
            return {
              json: (payload: unknown) => {
                body = payload;
              },
            };
          },
        }),
      }),
    },
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
  };
}

describe("ApiExceptionFilter", () => {
  it("maps financial errors to the standard HTTP error contract", () => {
    const filter = new ApiExceptionFilter();
    const context = createHost("/api/v1/players/player-1/buy");

    filter.catch(
      new InsufficientBalanceError([
        {
          type: "BuyRejectedInsufficientBalance",
          playerId: "player-1",
          occurredAt: new Date("2026-05-23T00:00:00.000Z"),
          quantity: Quantity.fromUnits(10),
          required: MoneyCents.fromCents(100_000),
          available: MoneyCents.fromCents(50_000),
        } as never,
      ]),
      context.host as never,
    );

    expect(context.statusCode).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(context.body).toMatchObject({
      error: {
        code: "INSUFFICIENT_BALANCE",
        message: "Saldo insuficiente para realizar a compra.",
        details: {
          requiredCents: 100_000,
          availableCents: 50_000,
          requiredAmountCents: 100_000,
          availableAmountCents: 50_000,
        },
        correlationId: "unknown",
      },
    });
    expect((context.body as { error: { timestamp: string } }).error.timestamp).toEqual(
      expect.any(String),
    );
  });

  it("maps validation errors without leaking framework envelopes", () => {
    const filter = new ApiExceptionFilter();
    const context = createHost("/api/v1/players");

    filter.catch(
      new BadRequestException("name is required"),
      context.host as never,
    );

    expect(context.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(context.body).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "name is required",
        correlationId: "unknown",
      },
    });
  });

  it("hides unexpected internal errors", () => {
    const filter = new ApiExceptionFilter();
    const context = createHost("/api/v1/players");

    filter.catch(new Error("database secret"), context.host as never);

    expect(context.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(context.body).toMatchObject({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro interno inesperado.",
        correlationId: "unknown",
      },
    });
  });
});
