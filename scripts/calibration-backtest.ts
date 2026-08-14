/**
 * Offline distribution check: simulated median lap (reference setup) vs stored OpenF1 baseline.
 *
 * Usage:
 *   npx ts-node --transpile-only -r reflect-metadata/register scripts/calibration-backtest.ts [trackSlug] [iterations]
 *
 * Requires: DB migrated, baseline row optional (loads openf1MedianLap when present).
 */
import 'reflect-metadata';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { DataSource, Repository } from 'typeorm';
import { TRACK_SEEDS } from '../src/database/seeds/track-seeds';
import { TrackLapBaseline } from '../src/modules/calibration/entities/track-lap-baseline.entity';
import { percentile } from '../src/modules/calibration/openf1-laps.aggregate';
import {
  referenceSetup,
  referenceStrategy,
} from '../src/modules/calibration/reference-sim';
import { SimulationEngine } from '../src/modules/simulation/engine/simulation.engine';
import type { TrackModel } from '../src/modules/simulation/engine/simulation.engine';

dotenv.config({ path: join(process.cwd(), '.env.local') });
dotenv.config({ path: join(process.cwd(), '.env') });

function seedToNumber(seed: number): number {
  return seed >>> 0;
}

function toModel(seedRow: (typeof TRACK_SEEDS)[0]): TrackModel {
  return {
    slug: seedRow.slug,
    laps: seedRow.laps,
    corners: seedRow.corners,
    trackTemperatureC: seedRow.trackTemperatureC,
    averageSpeedKph: seedRow.averageSpeedKph,
    sectors: seedRow.sectors,
    corners_data: seedRow.corners_data,
    characteristics: seedRow.characteristics,
  };
}

async function main(): Promise<void> {
  const slugArg = process.argv[2];
  const nArg = parseInt(process.argv[3] ?? '200', 10);
  const iterations = Number.isFinite(nArg) ? Math.min(2000, Math.max(10, nArg)) : 200;

  const slugs = slugArg
    ? [slugArg]
    : TRACK_SEEDS.map((t) => t.slug);

  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'gambit',
    password: process.env.DB_PASSWORD || 'gambit',
    database: process.env.DB_NAME || 'gambit',
    ssl:
      process.env.USE_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
    entities: [TrackLapBaseline],
    synchronize: false,
  });

  let repo: Repository<TrackLapBaseline> | null = null;
  try {
    await ds.initialize();
    repo = ds.getRepository(TrackLapBaseline);
  } catch {
    console.warn(
      '[calibration-backtest] DB unavailable — OpenF1 comparison lines omitted.',
    );
  }

  const report: Record<string, unknown>[] = [];

  for (const slug of slugs) {
    const row = TRACK_SEEDS.find((t) => t.slug === slug);
    if (!row) {
      console.error(`Unknown track slug: ${slug}`);
      continue;
    }
    const model = toModel(row);
    const setup = referenceSetup();
    const strat = referenceStrategy(model.laps);

    const medianLaps: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const eng = new SimulationEngine(
        setup,
        model,
        strat,
        seedToNumber(i + 1),
        `backtest:${slug}:${i}`,
        { gridSize: 20 },
      );
      const out = eng.run();
      const laps = out.telemetry.lapTimes
        .filter((x) => x.lap >= 2)
        .map((x) => x.timeSeconds)
        .sort((a, b) => a - b);
      medianLaps.push(percentile(laps, 0.5));
    }
    medianLaps.sort((a, b) => a - b);
    const simMedian = percentile(medianLaps, 0.5);
    const simQ1 = percentile(medianLaps, 0.25);
    const simQ3 = percentile(medianLaps, 0.75);

    let openf1Median: number | null = null;
    let relErr: number | null = null;
    if (repo) {
      const baseline = await repo.findOne({
        where: { trackSlug: slug, sessionType: '', weatherBucket: '' },
      });
      if (baseline) {
        openf1Median = baseline.aggregates.lapSeconds.median;
        relErr = (simMedian - openf1Median) / openf1Median;
      }
    }

    const entry = {
      trackSlug: slug,
      iterations,
      simMedianLapAcrossSeeds: simMedian,
      simQ1,
      simQ3,
      openf1MedianLap: openf1Median,
      relativeErrorVsOpenf1: relErr,
    };
    report.push(entry);
    console.log(JSON.stringify(entry));
  }

  if (repo) await ds.destroy();

  const outPath = join(process.cwd(), 'reports', 'calibration-backtest.json');
  try {
    const fs = await import('fs/promises');
    await fs.mkdir(join(process.cwd(), 'reports'), { recursive: true });
    await fs.writeFile(outPath, JSON.stringify(report, null, 2), 'utf8');
    console.error(`Wrote ${outPath}`);
  } catch {
    /* optional */
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
