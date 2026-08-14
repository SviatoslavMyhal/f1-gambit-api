/**
 * Ergast-compatible JSON API (default: Jolpica mirror — Ergast is deprecated).
 * @see https://github.com/jolpica/jolpica-ergast
 */

export type ErgastHttpClientOptions = {
  baseUrl: string;
  timeoutMs: number;
};

export class ErgastHttpClient {
  constructor(private readonly options: ErgastHttpClientOptions) {}

  async getJson<T = unknown>(path: string): Promise<T> {
    const url = `${this.options.baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.options.timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) {
        throw new Error(`F1 API ${res.status} ${res.statusText} for ${url}`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(t);
    }
  }
}
