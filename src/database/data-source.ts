import { join } from 'path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config({ path: join(process.cwd(), '.env.local') });

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'gambit',
  password: process.env.DB_PASSWORD || 'gambit',
  database: process.env.DB_NAME || 'gambit',
  ssl:
    process.env.USE_SSL === 'true'
      ? { rejectUnauthorized: false }
      : false,
  migrations: [join(__dirname, 'migrations', '*.ts')],
  migrationsTableName: 'migrations',
});
