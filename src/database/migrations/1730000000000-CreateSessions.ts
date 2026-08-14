import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSessions1730000000000 implements MigrationInterface {
  name = 'CreateSessions1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."sessions_status_enum" AS ENUM(
        'allocating',
        'simulating',
        'completed'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "playerName" character varying,
        "status" "public"."sessions_status_enum" NOT NULL DEFAULT 'allocating',
        "budgetAllocation" jsonb,
        "simulationResult" jsonb,
        "finalScore" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sessions" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sessions"`);
    await queryRunner.query(`DROP TYPE "public"."sessions_status_enum"`);
  }
}
