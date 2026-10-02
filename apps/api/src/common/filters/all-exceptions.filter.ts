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
  rpcResultCode?: string;
  timestamp: string;
  path: string;
}

interface NestErrorBody {
  error?: string;
  message?: string | string[];
  code?: string;
  rpcResultCode?: string;
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
    const isUniqueConstraintError =
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      exception.code === 'P2002';
    const statusCode = isHttpException
      ? exception.getStatus()
      : isUniqueConstraintError
        ? HttpStatus.CONFLICT
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttpException ? exception.getResponse() : undefined;
    const normalized = isUniqueConstraintError
      ? {
          error: 'Conflict',
          message: 'A resource with the same unique value already exists.',
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
        }
      : this.normalizeBody(body, statusCode);

    if (!isHttpException && !isUniqueConstraintError) {
      this.logger.error('Unhandled request error');
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
  ): Pick<ErrorResponse, 'error' | 'message' | 'code' | 'rpcResultCode'> {
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
        ...(nestBody.rpcResultCode
          ? { rpcResultCode: nestBody.rpcResultCode }
          : {}),
      };
    }

    return {
      error: fallbackError,
      message: 'Internal server error',
    };
  }
}
