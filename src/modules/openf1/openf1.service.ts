import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/**
 * Pass-through to https://api.openf1.org/v1 (historical data, no auth).
 * @see https://openf1.org/docs/#api-endpoints
 */
@Injectable()
export class OpenF1Service {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    this.baseUrl = (
      config.get<string>('OPENF1_BASE_URL') ?? 'https://api.openf1.org'
    ).replace(/\/$/, '');
    this.timeoutMs = parseInt(
      config.get<string>('OPENF1_TIMEOUT_MS') ?? '12000',
      10,
    );
  }

  async proxy(req: Request): Promise<unknown> {
    const full = req.originalUrl ?? req.url;
    const url = new URL(full, 'http://localhost');
    const match = url.pathname.match(/\/openf1\/(.+)$/);
    const sub = match?.[1];
    if (!sub || sub.includes('..')) {
      throw new BadRequestException(
        'Use GET /api/v1/openf1/{resource} with OpenF1 v1 paths, e.g. meetings, sessions, drivers',
      );
    }
    const target = `${this.baseUrl}/v1/${sub}${url.search}`;
    return this.fetchJson(target);
  }

  private async fetchJson(url: string): Promise<unknown> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      const text = await res.text();
      if (!res.ok) {
        throw new HttpException(
          `OpenF1 ${res.status}: ${text.slice(0, 400)}`,
          res.status >= 500 ? HttpStatus.BAD_GATEWAY : HttpStatus.BAD_REQUEST,
        );
      }
      return text ? JSON.parse(text) : [];
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw new HttpException(
        e instanceof Error ? e.message : 'OpenF1 request failed',
        HttpStatus.BAD_GATEWAY,
      );
    } finally {
      clearTimeout(t);
    }
  }
}
