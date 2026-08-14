import { MigrationInterface, QueryRunner } from 'typeorm';

export class BetsTable1780000000005 implements MigrationInterface {
  name = 'BetsTable1780000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "bet_status_enum" AS ENUM ('pending', 'won', 'lost', 'refunded')
    `);
    await queryRunner.query(`
      CREATE TABLE "bets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "lobbyId" uuid NOT NULL,
        "bettorUserId" uuid NOT NULL,
        "predictedWinnerUserId" uuid NOT NULL,
        "stake" integer NOT NULL,
        "status" "bet_status_enum" NOT NULL DEFAULT 'pending',
        "payout" integer,
        "settledAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bets" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bets_lobby" FOREIGN KEY ("lobbyId") REFERENCES "lobbies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_bets_bettor" FOREIGN KEY ("bettorUserId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_bets_lobby_status" ON "bets" ("lobbyId", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bets_bettor" ON "bets" ("bettorUserId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_bets_bettor"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bets_lobby_status"`);
    await queryRunner.query(`DROP TABLE "bets"`);
    await queryRunner.query(`DROP TYPE "bet_status_enum"`);
  }
}
