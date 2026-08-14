import { MigrationInterface, QueryRunner } from 'typeorm';

export class SessionCarSetup1770000000001 implements MigrationInterface {
  name = 'SessionCarSetup1770000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sessions"
      ADD COLUMN IF NOT EXISTS "carSetup" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN IF EXISTS "carSetup"`,
    );
  }
}
