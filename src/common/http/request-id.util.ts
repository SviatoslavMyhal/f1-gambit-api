import { randomUUID } from 'crypto';
import type { Request } from 'express';

const HEADER_KEYS = ['x-correlation-id', 'x-request-id'] as const;

/** Attach stable id on the request for logging and client correlation (mirrors header if sent). */
export function ensureRequestId(req: Request): string {
  if (typeof req.requestId === 'string' && req.requestId.trim().length > 0) {
    return req.requestId.trim();
  }
  for (const key of HEADER_KEYS) {
    const raw = req.headers[key];
    const s = Array.isArray(raw) ? raw[0] : raw;
    if (typeof s === 'string' && s.trim().length > 0) {
      req.requestId = s.trim();
      return req.requestId;
    }
  }
  req.requestId = randomUUID();
  return req.requestId;
}
