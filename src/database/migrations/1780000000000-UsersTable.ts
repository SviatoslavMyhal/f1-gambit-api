import { MigrationInterface, QueryRunner } from 'typeorm';

export class UsersTable1780000000000 implements MigrationInterface {
  name = 'UsersTable1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "username" character varying(20) NOT NULL,
        "email" character varying(255) NOT NULL,
        "passwordHash" character varying NOT NULL,
        "rating" integer NOT NULL DEFAULT 1200,
        "wins" integer NOT NULL DEFAULT 0,
        "losses" integer NOT NULL DEFAULT 0,
        "draws" integer NOT NULL DEFAULT 0,
        "racesCompleted" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_username" UNIQUE ("username"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_users_rating" ON "users" ("rating" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_username" ON "users" ("username")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_users_username"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_users_rating"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
