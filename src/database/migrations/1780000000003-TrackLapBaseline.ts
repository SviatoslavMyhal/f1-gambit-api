import { MigrationInterface, QueryRunner } from 'typeorm';

export class TrackLapBaseline1780000000003 implements MigrationInterface {
  name = 'TrackLapBaseline1780000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "track_lap_baselines" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "trackSlug" character varying(64) NOT NULL,
        "sessionType" character varying(32) NOT NULL DEFAULT '',
        "weatherBucket" character varying(32) NOT NULL DEFAULT '',
        "source" character varying(32) NOT NULL DEFAULT 'openf1',
        "fetchedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "baselineVersion" integer NOT NULL DEFAULT 1,
        "openf1MeetingKey" integer,
        "openf1SessionKey" integer,
        "aggregates" jsonb NOT NULL,
        "calibration" jsonb NOT NULL,
        CONSTRAINT "PK_track_lap_baselines" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_track_lap_baselines_slug_ctx" UNIQUE ("trackSlug", "sessionType", "weatherBucket")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_track_lap_baselines_trackSlug" ON "track_lap_baselines" ("trackSlug")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "track_lap_baselines"`);
  }
}
