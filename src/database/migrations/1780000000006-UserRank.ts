import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserRank1780000000006 implements MigrationInterface {
  name = 'UserRank1780000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "rank" integer`);
    await queryRunner.query(`CREATE INDEX "IDX_users_rank" ON "users" ("rank")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_users_rank"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "rank"`);
  }
}
