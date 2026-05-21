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
  error: {
    type: "business_rule_violation" | "validation_error" | "technical_error";
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status(code: number): { json(body: ApiErrorResponse): void };
    }>();

    if (exception instanceof OperationRejectedError) {
      response.status(this.statusForBusinessError(exception.code)).json({
        error: {
          type: "business_rule_violation",
          code: exception.code,
          message: exception.message,
        },
      });
      return;
    }

    if (exception instanceof BadRequestException) {
      response.status(HttpStatus.BAD_REQUEST).json({
        error: {
          type: "validation_error",
          code: "VALIDATION_ERROR",
          message: this.messageFromHttpException(exception),
        },
      });
      return;
    }

    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json({
        error: {
          type: "technical_error",
          code: "HTTP_ERROR",
          message: this.messageFromHttpException(exception),
        },
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        type: "technical_error",
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro interno inesperado.",
      },
    });
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

    return HttpStatus.UNPROCESSABLE_ENTITY;
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
}
