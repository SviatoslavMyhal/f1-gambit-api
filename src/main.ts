import { IoAdapter } from '@nestjs/platform-socket.io';
import { ExpressAdapter } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { AppModule } from './app.module';
import { GLOBAL_API_PREFIX } from './common/api-versioning';
import { applyMiddlewareBeforeNestRoutes } from './common/middleware/pre-nest-express-stack';
import { configureApp } from './configure-app';

async function bootstrap() {
  const expressApp = express();
  applyMiddlewareBeforeNestRoutes(expressApp);

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    {
      logger:
        process.env.NODE_ENV === 'local'
          ? ['log', 'debug', 'error', 'warn']
          : ['error', 'warn'],
    },
  );
  app.useWebSocketAdapter(new IoAdapter(app));
  await configureApp(app);
  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port);
  console.log(`API: http://localhost:${port}/${GLOBAL_API_PREFIX}`);
  console.log(
    `Auth login (POST JSON): http://localhost:${port}/${GLOBAL_API_PREFIX}/auth/login`,
  );
  console.log(`Swagger: http://localhost:${port}/api/docs`);
}

bootstrap();
