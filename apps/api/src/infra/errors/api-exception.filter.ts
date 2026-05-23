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
      response.status(statusCode).json(
        this.toResponseBody(statusCode, exception.code, exception.message, {
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
      code === "ASSET_NOT_FOUND" ||
      code === "WALLET_NOT_FOUND" ||
      code === "POSITION_NOT_FOUND" ||
      code === "INCOME_EVENT_NOT_FOUND"
    ) {
      return HttpStatus.NOT_FOUND;
    }

    return HttpStatus.BAD_REQUEST;
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
