/**
 * lambda.ts — Entry point for AWS Lambda.
 *
 * Key pattern: NestJS bootstraps once and is cached across warm invocations.
 * The `serverless-http` adapter bridges API Gateway HTTP API (payload v2)
 * to the underlying Express instance NestJS creates.
 *
 * Cold start budget on 512MB: ~600–900ms (NestJS init + TypeORM connect via proxy)
 * Warm invocation: ~10–40ms
 */
import { ValidationPipe, RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import type { Request } from 'express';
import * as express from 'express';
import serverlessHttp from 'serverless-http';
import { AppModule } from './app.module';
import {
  GLOBAL_API_PREFIX,
  OPENAPI_SPEC_VERSION,
  withOpenApiVersioningNotes,
} from './common/api-versioning';
import { browserCorsOptions } from './common/cors-non-production';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { QueryFailedFilter } from './common/filters/query-failed.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { applyMiddlewareBeforeNestRoutes } from './common/middleware/pre-nest-express-stack';

// Cached handler — reused on warm invocations
let cachedHandler: ReturnType<typeof serverlessHttp>;

async function bootstrap() {
  if (cachedHandler) return cachedHandler;

  const expressApp = express();
  applyMiddlewareBeforeNestRoutes(expressApp);

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    {
      // Suppress NestJS startup logs in Lambda (goes to CloudWatch anyway)
      logger:
        process.env.NODE_ENV === 'local'
          ? ['log', 'debug', 'error', 'warn']
          : ['error', 'warn'],
    },
  );

  // ── Global pipes ────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global filters & interceptors ───────────────────────────────────────────
  app.useGlobalFilters(new QueryFailedFilter(), new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // ── API prefix (Swagger lives outside GLOBAL_API_PREFIX) ────────────────────
  app.setGlobalPrefix(GLOBAL_API_PREFIX, {
    exclude: [
      { path: 'api/docs', method: RequestMethod.ALL },
      { path: 'api/docs-json', method: RequestMethod.ALL },
      { path: 'api/docs-yaml', method: RequestMethod.ALL },
    ],
  });

  // ── Swagger (dev only — skip in prod Lambda for faster cold starts) ─────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle("F1 Constructor's Gambit API")
      .setDescription(
        withOpenApiVersioningNotes(
          'Budget allocation simulation for F1 teams',
        ),
      )
      .setVersion(OPENAPI_SPEC_VERSION)
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // ── CORS (API Gateway handles this in prod; mirror dev API CORS when running locally)
  if (process.env.NODE_ENV === 'local') {
    app.enableCors(browserCorsOptions());
  }

  await app.init();

  cachedHandler = serverlessHttp(app.getHttpAdapter().getInstance(), {
    // API Gateway HTTP API uses payload format version 2.0
    request(req: Request, event: APIGatewayProxyEventV2) {
      req.lambdaEvent = event;
    },
  });

  return cachedHandler;
}

export const handler = async (
  event: APIGatewayProxyEventV2,
  context: Context,
) => {
  // Prevent Lambda from waiting for the event loop to drain
  // (important with TypeORM connection pool)
  context.callbackWaitsForEmptyEventLoop = false;

  const handlerFn = await bootstrap();
  return handlerFn(event, context);
};
