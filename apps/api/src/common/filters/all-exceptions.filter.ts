import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  code?: string;
  timestamp: string;
  path: string;
}

interface NestErrorBody {
  error?: string;
  message?: string | string[];
  code?: string;
}

interface HttpRequest {
  originalUrl: string;
}

interface HttpResponse {
  status(statusCode: number): HttpResponse;
  json(body: ErrorResponse): void;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<HttpRequest>();
    const response = context.getResponse<HttpResponse>();
    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttpException ? exception.getResponse() : undefined;
    const normalized = this.normalizeBody(body, statusCode);

    if (!isHttpException) {
      this.logger.error('Unhandled request error', exception);
    }

    const payload: ErrorResponse = {
      statusCode,
      error: normalized.error,
      message: normalized.message,
      ...(normalized.code ? { code: normalized.code } : {}),
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    };

    response.status(statusCode).json(payload);
  }

  private normalizeBody(
    body: string | object | undefined,
    statusCode: number,
  ): Pick<ErrorResponse, 'error' | 'message' | 'code'> {
    const fallbackError = HttpStatus[statusCode] ?? 'Internal Server Error';

    if (typeof body === 'string') {
      return { error: fallbackError, message: body };
    }

    if (body && typeof body === 'object') {
      const nestBody = body as NestErrorBody;
      return {
        error: nestBody.error ?? fallbackError,
        message: nestBody.message ?? fallbackError,
        ...(nestBody.code ? { code: nestBody.code } : {}),
      };
    }

    return {
      error: fallbackError,
      message: 'Internal server error',
    };
  }
}
