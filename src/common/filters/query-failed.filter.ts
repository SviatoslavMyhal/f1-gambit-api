import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ensureRequestId } from '../http/request-id.util';

/** PostgreSQL error fields exposed on `pg` `DatabaseError` */
type PgDriverError = {
  code?: string;
  detail?: string;
  constraint?: string;
  table?: string;
};

@Catch(QueryFailedError)
export class QueryFailedFilter implements ExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const requestId = ensureRequestId(req);

    const driver = exception.driverError as PgDriverError;
    const pgCode = driver.code;

    let status: number;
    let error: Record<string, unknown>;

    switch (pgCode) {
      case '23505':
        status = HttpStatus.CONFLICT;
        error = {
          message: 'A record with this value already exists',
          code: 'UNIQUE_VIOLATION',
        };
        break;
      case '23503':
        status = HttpStatus.BAD_REQUEST;
        error = {
          message: 'Related record does not exist or cannot be referenced',
          code: 'FOREIGN_KEY_VIOLATION',
        };
        break;
      default:
        console.error('[QueryFailedFilter]', exception);
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        error = { message: 'Internal server error' };
    }

    if (
      process.env.NODE_ENV !== 'production' &&
      status !== HttpStatus.INTERNAL_SERVER_ERROR &&
      driver
    ) {
      if (driver.detail) {
        error.detail = driver.detail;
      }
      if (driver.constraint) {
        error.constraint = driver.constraint;
      }
      if (driver.table) {
        error.table = driver.table;
      }
    }

    const payload: Record<string, unknown> = {
      success: false,
      path: req.url,
      statusCode: status,
      error,
      requestId,
    };

    if (
      process.env.NODE_ENV !== 'production' &&
      status === HttpStatus.INTERNAL_SERVER_ERROR
    ) {
      payload.detail = exception.message;
    }

    res.status(status).json(payload);
  }
}
