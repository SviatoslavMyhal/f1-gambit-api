import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Idempotent: safe if 174 already ran. Fixes POST /sessions 500 when
 * DB was created before constructor columns existed.
 */
export class EnsureSessionColumns1750000000000 implements MigrationInterface {
  name = 'EnsureSessionColumns1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sessions"
      ADD COLUMN IF NOT EXISTS "seasonYear" integer NOT NULL DEFAULT 2024
    `);
    await queryRunner.query(`
      ALTER TABLE "sessions"
      ADD COLUMN IF NOT EXISTS "compareConstructorRef" character varying(64)
    `);
    await queryRunner.query(`
      ALTER TABLE "sessions"
      ADD COLUMN IF NOT EXISTS "lastSimulationSeed" character varying(128)
    `);
  }

  public async down(): Promise<void> {
    // no-op: columns may be required by app; do not drop
  }
}
