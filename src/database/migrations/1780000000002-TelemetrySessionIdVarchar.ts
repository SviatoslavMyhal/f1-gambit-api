import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Multiplayer telemetry uses session keys like `{lobbyUuid}:host` — not valid UUIDs.
 * Drop FK to sessions (multiplayer rows are not sessions) and widen column.
 */
export class TelemetrySessionIdVarchar1780000000002 implements MigrationInterface {
  name = 'TelemetrySessionIdVarchar1780000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "telemetry_snapshots"
      DROP CONSTRAINT IF EXISTS "FK_telemetry_snapshots_session"
    `);
    await queryRunner.query(`
      ALTER TABLE "telemetry_snapshots"
      ALTER COLUMN "sessionId" TYPE character varying(128)
      USING ("sessionId"::text)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "telemetry_snapshots"
      WHERE "sessionId" !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    `);
    await queryRunner.query(`
      ALTER TABLE "telemetry_snapshots"
      ALTER COLUMN "sessionId" TYPE uuid
      USING ("sessionId"::uuid)
    `);
    await queryRunner.query(`
      ALTER TABLE "telemetry_snapshots"
      ADD CONSTRAINT "FK_telemetry_snapshots_session"
      FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE
    `);
  }
}
