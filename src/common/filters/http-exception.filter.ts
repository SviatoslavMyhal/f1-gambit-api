import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ensureRequestId } from '../http/request-id.util';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const requestId = ensureRequestId(req);

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    if (!(exception instanceof HttpException)) {
      console.error('[HttpExceptionFilter]', exception);
    }

    const payload: Record<string, unknown> = {
      success: false,
      path: req.url,
      statusCode: status,
      error: message,
      requestId,
    };

    if (
      process.env.NODE_ENV !== 'production' &&
      exception instanceof Error &&
      !(exception instanceof HttpException)
    ) {
      payload.detail = exception.message;
    }

    res.status(status).json(payload);
  }
}
