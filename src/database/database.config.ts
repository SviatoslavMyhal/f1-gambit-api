import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

type RdsSecretPayload = {
  username?: string;
  password?: string;
  host?: string;
  port?: number;
  dbname?: string;
};

type PgCore = Pick<
  PostgresConnectionOptions,
  'host' | 'port' | 'username' | 'password' | 'database' | 'ssl'
>;

let cachedSecret: RdsSecretPayload | null = null;

async function loadSecretFromArn(secretArn: string): Promise<RdsSecretPayload> {
  if (cachedSecret) return cachedSecret;
  const client = new SecretsManagerClient({});
  const res = await client.send(
    new GetSecretValueCommand({ SecretId: secretArn }),
  );
  const raw = res.SecretString;
  if (!raw) throw new Error('SecretString empty');
  cachedSecret = JSON.parse(raw) as RdsSecretPayload;
  return cachedSecret;
}

export async function resolveDatabaseConfig(config: ConfigService): Promise<PgCore> {
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  const secretArn = config.get<string>('DB_SECRET_ARN');

  if (isLambda && secretArn) {
    const s = await loadSecretFromArn(secretArn);
    return {
      host: s.host ?? '',
      port: typeof s.port === 'number' ? s.port : 5432,
      username: s.username ?? '',
      password: s.password ?? '',
      database: s.dbname ?? '',
      ssl: { rejectUnauthorized: false },
    };
  }

  return {
    host: config.get<string>('DB_HOST', 'localhost'),
    port: parseInt(config.get<string>('DB_PORT', '5432'), 10),
    username: config.get<string>('DB_USER', 'gambit'),
    password: config.get<string>('DB_PASSWORD', 'gambit'),
    database: config.get<string>('DB_NAME', 'gambit'),
    ssl:
      config.get<string>('USE_SSL', 'false') === 'true'
        ? { rejectUnauthorized: false }
        : false,
  };
}

export async function createTypeOrmOptions(
  config: ConfigService,
): Promise<TypeOrmModuleOptions> {
  const base = await resolveDatabaseConfig(config);
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  const migrationsRun =
    config.get<string>('MIGRATIONS_RUN_ON_START', isLambda ? 'true' : 'false') ===
    'true';

  return {
    type: 'postgres',
    host: base.host,
    port: base.port,
    username: base.username,
    password: base.password,
    database: base.database,
    ssl: base.ssl,
    autoLoadEntities: true,
    synchronize: false,
    migrationsRun,
    migrations: [join(__dirname, 'migrations', '*.js')],
    migrationsTableName: 'migrations',
  };
}
