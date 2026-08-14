import type { Express } from 'express';

import { httpAccessLogMiddleware } from './http-access-log.middleware';
import { legacyAuthApiPrefixMiddleware } from './legacy-auth-api-prefix.middleware';

/**
 * Attach these to Express **before** `NestFactory.create(..., new ExpressAdapter(expressApp))`,
 * otherwise they register after Nest’s router and `/api/auth/*` rewrites never run.
 */
export function applyMiddlewareBeforeNestRoutes(expressApp: Express): void {
  expressApp.use(legacyAuthApiPrefixMiddleware);
  expressApp.use(httpAccessLogMiddleware);
}
