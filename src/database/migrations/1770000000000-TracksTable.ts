import { MigrationInterface, QueryRunner } from 'typeorm';
import { TRACK_SEEDS } from '../seeds/track-seeds';

export class TracksTable1770000000000 implements MigrationInterface {
  name = 'TracksTable1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tracks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "slug" character varying(64) NOT NULL,
        "name" character varying(256) NOT NULL,
        "country" character varying(128) NOT NULL,
        "lengthKm" double precision NOT NULL,
        "laps" integer NOT NULL,
        "corners" integer NOT NULL,
        "averageSpeedKph" double precision NOT NULL,
        "trackTemperatureC" double precision NOT NULL,
        "sectors" jsonb NOT NULL,
        "corners_data" jsonb NOT NULL,
        "characteristics" jsonb NOT NULL,
        CONSTRAINT "PK_tracks" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tracks_slug" UNIQUE ("slug")
      )
    `);

    for (const t of TRACK_SEEDS) {
      await queryRunner.query(
        `
        INSERT INTO "tracks" ("slug","name","country","lengthKm","laps","corners","averageSpeedKph","trackTemperatureC","sectors","corners_data","characteristics")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb)
      `,
        [
          t.slug,
          t.name,
          t.country,
          t.lengthKm,
          t.laps,
          t.corners,
          t.averageSpeedKph,
          t.trackTemperatureC,
          JSON.stringify(t.sectors),
          JSON.stringify(t.corners_data),
          JSON.stringify(t.characteristics),
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tracks"`);
  }
}
