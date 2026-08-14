import type { NextFunction, Request, Response } from 'express';

const LEGACY_AUTH_PREFIX = '/api/auth';

/**
 * Some clients use `POST /api/auth/login` while the app global prefix is `api/v1`.
 * Rewrite the path early so the request hits {@link AuthController} without 404.
 */
export function legacyAuthApiPrefixMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const original = req.originalUrl;
  const q = original.indexOf('?');
  const pathOnly = q === -1 ? original : original.slice(0, q);
  const query = q === -1 ? '' : original.slice(q);

  if (
    pathOnly === LEGACY_AUTH_PREFIX ||
    pathOnly.startsWith(`${LEGACY_AUTH_PREFIX}/`)
  ) {
    const tail = pathOnly.slice(LEGACY_AUTH_PREFIX.length);
    const rewritten = `/api/v1/auth${tail}${query}`;
    req.url = rewritten;
    // Some layers read `originalUrl`; keep it aligned with the routed path.
    req.originalUrl = rewritten;
  }

  next();
}
