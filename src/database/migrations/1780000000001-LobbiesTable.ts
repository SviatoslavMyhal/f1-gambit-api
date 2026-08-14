import { MigrationInterface, QueryRunner } from 'typeorm';

export class LobbiesTable1780000000001 implements MigrationInterface {
  name = 'LobbiesTable1780000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "lobby_status_enum" AS ENUM (
        'waiting',
        'configuring',
        'ready',
        'simulating',
        'finished',
        'cancelled'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "weather_condition_enum" AS ENUM ('dry', 'mixed', 'wet')
    `);
    await queryRunner.query(`
      CREATE TABLE "lobbies" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "inviteCode" character varying(6) NOT NULL,
        "hostUserId" uuid NOT NULL,
        "opponentUserId" uuid,
        "status" "lobby_status_enum" NOT NULL DEFAULT 'waiting',
        "configTimeLimitMinutes" integer NOT NULL DEFAULT 5,
        "configDeadline" TIMESTAMP WITH TIME ZONE,
        "trackId" uuid NOT NULL,
        "weather" "weather_condition_enum" NOT NULL,
        "simulationSeed" integer NOT NULL,
        "hostReady" boolean NOT NULL DEFAULT false,
        "opponentReady" boolean NOT NULL DEFAULT false,
        "hostConfig" jsonb,
        "opponentConfig" jsonb,
        "winnerUserId" uuid,
        "simulationResult" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lobbies" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_lobbies_inviteCode" UNIQUE ("inviteCode"),
        CONSTRAINT "FK_lobbies_host" FOREIGN KEY ("hostUserId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_lobbies_opponent" FOREIGN KEY ("opponentUserId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_lobbies_track" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_lobbies_status" ON "lobbies" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lobbies_host" ON "lobbies" ("hostUserId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lobbies_inviteCode" ON "lobbies" ("inviteCode")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_lobbies_inviteCode"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_lobbies_host"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_lobbies_status"`);
    await queryRunner.query(`DROP TABLE "lobbies"`);
    await queryRunner.query(`DROP TYPE "weather_condition_enum"`);
    await queryRunner.query(`DROP TYPE "lobby_status_enum"`);
  }
}
