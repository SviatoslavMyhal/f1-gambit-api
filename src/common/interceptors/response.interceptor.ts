import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ensureRequestId } from '../http/request-id.util';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const requestId = ensureRequestId(req);
    const p = req.path ?? '';
    if (
      p.startsWith('/api/docs') ||
      p.startsWith('/api/docs-json') ||
      p.startsWith('/api/docs-yaml')
    ) {
      return next.handle();
    }
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
        requestId,
      })),
    );
  }
}
