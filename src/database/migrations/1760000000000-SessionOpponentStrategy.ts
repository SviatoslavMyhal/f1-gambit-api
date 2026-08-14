import { MigrationInterface, QueryRunner } from 'typeorm';

export class SessionOpponentStrategy1760000000000 implements MigrationInterface {
  name = 'SessionOpponentStrategy1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sessions"
      ADD COLUMN IF NOT EXISTS "opponentConstructorRef" character varying(64) NOT NULL DEFAULT 'red_bull'
    `);
    await queryRunner.query(`
      ALTER TABLE "sessions"
      ADD COLUMN IF NOT EXISTS "strategyMetrics" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN IF EXISTS "strategyMetrics"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN IF EXISTS "opponentConstructorRef"`,
    );
  }
}
