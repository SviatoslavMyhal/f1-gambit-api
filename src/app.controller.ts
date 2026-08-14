import { Controller, Get, Scope } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { CorrelationService } from './common/request-scoped/correlation.service';

/** Request-scoped controller demo: pairs with {@link CorrelationService} for learning REQUEST scope. */
@ApiExcludeController()
@Controller({ scope: Scope.REQUEST })
export class AppController {
  constructor(private readonly correlation: CorrelationService) {}

  @Get('health')
  health() {
    return { ok: true, requestId: this.correlation.getId() };
  }
}
