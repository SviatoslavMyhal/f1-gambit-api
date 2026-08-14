import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConstructorGambitUpgrade1740000000000 implements MigrationInterface {
  name = 'ConstructorGambitUpgrade1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sessions"
      ADD COLUMN "seasonYear" integer NOT NULL DEFAULT 2024
    `);
    await queryRunner.query(`
      ALTER TABLE "sessions"
      ADD COLUMN "compareConstructorRef" character varying(64)
    `);
    await queryRunner.query(`
      ALTER TABLE "sessions"
      ADD COLUMN "lastSimulationSeed" character varying(128)
    `);

    await queryRunner.query(`
      CREATE TABLE "f1_api_cache" (
        "cacheKey" character varying(512) NOT NULL,
        "payload" jsonb NOT NULL,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_f1_api_cache" PRIMARY KEY ("cacheKey")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "simulation_runs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "sessionId" uuid NOT NULL,
        "seed" character varying(128) NOT NULL,
        "simVersion" smallint NOT NULL,
        "result" jsonb NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_simulation_runs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "simulation_runs"
      ADD CONSTRAINT "FK_simulation_runs_session"
      FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_simulation_runs_session_created"
      ON "simulation_runs" ("sessionId", "createdAt")
    `);

    await queryRunner.query(`
      CREATE TABLE "leaderboard_entries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "sessionId" uuid NOT NULL,
        "playerName" character varying(128) NOT NULL,
        "constructorPoints" integer NOT NULL,
        "meta" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_leaderboard_entries" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_leaderboard_session" UNIQUE ("sessionId")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_leaderboard_points"
      ON "leaderboard_entries" ("constructorPoints", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_leaderboard_points"`);
    await queryRunner.query(`DROP TABLE "leaderboard_entries"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_simulation_runs_session_created"`);
    await queryRunner.query(`DROP TABLE "simulation_runs"`);
    await queryRunner.query(`DROP TABLE "f1_api_cache"`);
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN "lastSimulationSeed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN "compareConstructorRef"`,
    );
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "seasonYear"`);
  }
}
