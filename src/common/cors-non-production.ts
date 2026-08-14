import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

function looksLikeLocalBrowserOrigin(origin: string): boolean {
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  // Some stacks use IPv6 loopback in the Origin header (e.g. http://[::1]:5173/)
  return /^https?:\/\/\[::1\](:\d+)?$/i.test(origin);
}

/**
 * CORS when the SPA calls the API by full URL (e.g. http://localhost:3000/api/v1),
 * typical with Vite on another port — not when using same-origin `/api` proxy.
 */
export function browserCorsOptions(): CorsOptions {
  const extra =
    process.env.CORS_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
  /** Primary SPA dev hosts (matches Vite defaults). */
  const knownDevOrigins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...extra,
  ]);

  return {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (knownDevOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, looksLikeLocalBrowserOrigin(origin));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Accept',
      'X-Correlation-Id',
      'X-Request-Id',
      'X-Requested-With',
    ],
  };
}
