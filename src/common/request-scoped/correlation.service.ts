import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { ensureRequestId } from '../http/request-id.util';

/**
 * REQUEST-scoped helper: safe to inject only into other request-scoped providers
 * or request-scoped controllers (see {@link AppController}).
 */
@Injectable({ scope: Scope.REQUEST })
export class CorrelationService {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  getId(): string {
    return ensureRequestId(this.request);
  }
}
