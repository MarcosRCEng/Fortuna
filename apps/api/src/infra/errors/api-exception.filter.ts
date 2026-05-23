import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { OperationRejectedError } from "@fortuna/domain";

interface ApiErrorResponse {
  statusCode: number;
  error: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  path: string;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<{ url?: string }>();
    const response = host.switchToHttp().getResponse<{
      status(code: number): { json(body: ApiErrorResponse): void };
    }>();

    if (exception instanceof OperationRejectedError) {
      const statusCode = this.statusForBusinessError(exception.code);
      const mapped = this.mapBusinessError(exception);
      response.status(statusCode).json(
        this.toResponseBody(statusCode, mapped.code, mapped.message, {
          path: request.url,
          details: this.detailsFromBusinessError(exception),
        }),
      );
      return;
    }

    if (exception instanceof BadRequestException) {
      response
        .status(HttpStatus.BAD_REQUEST)
        .json(
          this.toResponseBody(
            HttpStatus.BAD_REQUEST,
            "VALIDATION_ERROR",
            this.messageFromHttpException(exception),
            { path: request.url },
          ),
        );
      return;
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      response
        .status(statusCode)
        .json(
          this.toResponseBody(
            statusCode,
            "HTTP_ERROR",
            this.messageFromHttpException(exception),
            { path: request.url },
          ),
        );
      return;
    }

    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(
        this.toResponseBody(
          HttpStatus.INTERNAL_SERVER_ERROR,
          "INTERNAL_SERVER_ERROR",
          "Erro interno inesperado.",
          { path: request.url },
        ),
      );
  }

  private statusForBusinessError(code: string): number {
    if (
      code === "PLAYER_NOT_FOUND" ||
      code === "ASSET_NOT_FOUND" ||
      code === "WALLET_NOT_FOUND" ||
      code === "INCOME_EVENT_NOT_FOUND"
    ) {
      return HttpStatus.NOT_FOUND;
    }

    if (
      code === "INSUFFICIENT_BALANCE" ||
      code === "INSUFFICIENT_POSITION" ||
      code === "INCOME_ALREADY_COLLECTED" ||
      code === "NO_INCOME_AVAILABLE"
    ) {
      return HttpStatus.UNPROCESSABLE_ENTITY;
    }

    return HttpStatus.BAD_REQUEST;
  }

  private mapBusinessError(exception: OperationRejectedError): {
    code: string;
    message: string;
  } {
    const messages: Record<string, string> = {
      PLAYER_NOT_FOUND: "Jogador nao encontrado.",
      ASSET_NOT_FOUND: "Ativo nao encontrado.",
      WALLET_NOT_FOUND: "Carteira nao encontrada.",
      POSITION_NOT_FOUND: "Posicao nao encontrada.",
      INSUFFICIENT_BALANCE: "Saldo insuficiente para realizar a compra.",
      INSUFFICIENT_POSITION:
        "Quantidade insuficiente em carteira para realizar a venda.",
      INVALID_QUANTITY: "Quantidade invalida para a ordem.",
      NO_INCOME_AVAILABLE: "Nao ha rendimentos disponiveis para coleta.",
      INCOME_ALREADY_COLLECTED: "Rendimento ja coletado.",
      INCOME_EVENT_NOT_FOUND: "Rendimento nao encontrado.",
    };

    return {
      code:
        exception.code === "INSUFFICIENT_BALANCE"
          ? "INSUFFICIENT_FUNDS"
          : exception.code === "INVALID_QUANTITY"
            ? "INVALID_ORDER_QUANTITY"
            : exception.code,
      message: messages[exception.code] ?? exception.message,
    };
  }

  private messageFromHttpException(exception: HttpException): string {
    const body = exception.getResponse();
    if (typeof body === "string") {
      return body;
    }

    if (
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message === "string"
    ) {
      return body.message;
    }

    return exception.message;
  }

  private toResponseBody(
    statusCode: number,
    code: string,
    message: string,
    options: { path?: string; details?: Record<string, unknown> } = {},
  ): ApiErrorResponse {
    return {
      statusCode,
      error: code,
      code,
      message,
      ...(options.details ? { details: options.details } : {}),
      timestamp: new Date().toISOString(),
      path: options.path ?? "",
    };
  }

  private detailsFromBusinessError(
    exception: OperationRejectedError,
  ): Record<string, unknown> | undefined {
    const [event] = exception.events;
    if (!event) {
      return undefined;
    }

    if ("required" in event && "available" in event) {
      return {
        requiredCents: event.required.cents,
        availableCents: event.available.cents,
        requiredAmountCents: event.required.cents,
        availableAmountCents: event.available.cents,
      };
    }

    if ("quantity" in event && "availableQuantity" in event) {
      return {
        requestedQuantity: event.quantity.units,
        availableQuantity: event.availableQuantity,
      };
    }

    if ("total" in event) {
      return {
        totalCents: event.total.cents,
      };
    }

    return undefined;
  }
}
