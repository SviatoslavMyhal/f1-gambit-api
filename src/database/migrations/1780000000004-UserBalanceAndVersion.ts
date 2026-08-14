import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserBalanceAndVersion1780000000004 implements MigrationInterface {
  name = 'UserBalanceAndVersion1780000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "balance" integer NOT NULL DEFAULT 1000,
      ADD COLUMN "version" integer NOT NULL DEFAULT 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "version",
      DROP COLUMN "balance"
    `);
  }
}
