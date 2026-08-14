import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  GLOBAL_API_PREFIX,
  OPENAPI_SPEC_VERSION,
  withOpenApiVersioningNotes,
} from './common/api-versioning';
import { browserCorsOptions } from './common/cors-non-production';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { QueryFailedFilter } from './common/filters/query-failed.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

export async function configureApp(app: INestApplication): Promise<void> {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new QueryFailedFilter(), new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  app.setGlobalPrefix(GLOBAL_API_PREFIX, {
    exclude: [
      { path: 'api/docs', method: RequestMethod.ALL },
      { path: 'api/docs-json', method: RequestMethod.ALL },
      { path: 'api/docs-yaml', method: RequestMethod.ALL },
    ],
  });

  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("F1 Constructor's Gambit API")
      .setDescription(
        withOpenApiVersioningNotes(
          'Budget allocation simulation for F1 teams',
        ),
      )
      .setVersion(OPENAPI_SPEC_VERSION)
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  // SPA on another origin (e.g. Vite :5173) → full URL http://localhost:3000/api/v1
  const corsOriginsConfigured = Boolean(
    process.env.CORS_ORIGINS?.split(',').some((s) => s.trim()),
  );
  const applyBrowserCors =
    process.env.NODE_ENV !== 'production' || corsOriginsConfigured;
  if (applyBrowserCors) {
    app.enableCors(browserCorsOptions());
  }
}
