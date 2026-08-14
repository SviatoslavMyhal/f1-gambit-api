import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExternalDataCache1770000000003 implements MigrationInterface {
  name = 'ExternalDataCache1770000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "external_data_cache" (
        "key" character varying(512) NOT NULL,
        "data" jsonb NOT NULL,
        "fetchedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "ttlSeconds" integer NOT NULL,
        CONSTRAINT "PK_external_data_cache" PRIMARY KEY ("key")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "external_data_cache"`);
  }
}
