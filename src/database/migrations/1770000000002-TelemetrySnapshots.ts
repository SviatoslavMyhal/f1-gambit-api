import { MigrationInterface, QueryRunner } from 'typeorm';

export class TelemetrySnapshots1770000000002 implements MigrationInterface {
  name = 'TelemetrySnapshots1770000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "telemetry_snapshots" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "sessionId" uuid NOT NULL,
        "data" jsonb NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_telemetry_snapshots" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_telemetry_session" UNIQUE ("sessionId")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_telemetry_snapshots_session"
      ON "telemetry_snapshots" ("sessionId")
    `);
    await queryRunner.query(`
      ALTER TABLE "telemetry_snapshots"
      ADD CONSTRAINT "FK_telemetry_snapshots_session"
      FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "telemetry_snapshots" DROP CONSTRAINT "FK_telemetry_snapshots_session"`,
    );
    await queryRunner.query(`DROP TABLE "telemetry_snapshots"`);
  }
}
