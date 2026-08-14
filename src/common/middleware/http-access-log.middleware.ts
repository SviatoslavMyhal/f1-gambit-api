import type { NextFunction, Request, Response } from 'express';
import { ensureRequestId } from '../http/request-id.util';

function shouldSkipAccessLog(path: string): boolean {
  return (
    path.startsWith('/api/docs') ||
    path.startsWith('/api/docs-json') ||
    path.startsWith('/api/docs-yaml')
  );
}

/**
 * Runs early in the Express chain: stable {@link Request.requestId} for guards/filters/interceptors,
 * optional {@link Request.requestStartedAt}, and a one-line access log on response finish.
 */
export function httpAccessLogMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const path = req.path ?? '';
  ensureRequestId(req);
  const startedAt = Date.now();
  req.requestStartedAt = startedAt;

  if (!shouldSkipAccessLog(path)) {
    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      console.log(
        `[HTTP] ${req.method} ${path} ${res.statusCode} ${durationMs}ms ${req.requestId ?? '-'}`,
      );
    });
  }

  next();
}
