import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TireCompound } from '../../setup/dto/tire-compound';
import { Track } from '../../track/entities/track.entity';
import type { RaceStrategy } from './race-strategy';

@Injectable()
export class StrategyService {
  constructor(
    @InjectRepository(Track)
    private readonly tracks: Repository<Track>,
  ) {}

  /** Three variants: aggressive 1-stop, balanced, conservative 2-stop */
  async generateStrategiesForSlug(slug: string): Promise<RaceStrategy[]> {
    const track = await this.tracks.findOne({ where: { slug } });
    if (!track) throw new NotFoundException(`Track ${slug} not found`);
    const laps = track.laps;
    const deg = track.characteristics.tireDegradationMultiplier;

    const pit1 = Math.max(12, Math.floor(laps * 0.35));
    const pit2 = Math.max(pit1 + 8, Math.floor(laps * 0.62));

    const aggressive: RaceStrategy = {
      stints: [
        {
          stint: 0,
          compound: TireCompound.SOFT,
          startLap: 1,
          targetEndLap: pit1,
          pushMode: 'PUSH',
        },
        {
          stint: 1,
          compound: TireCompound.HARD,
          startLap: pit1 + 1,
          targetEndLap: laps,
          pushMode: 'MANAGE',
        },
      ],
      pitWindows: [
        {
          stint: 0,
          earliest: pit1 - 2,
          latest: pit1 + 4,
          optimal: pit1,
          undercut: true,
          overcut: false,
        },
      ],
      targetLapTime: 92,
      underFuelThreshold: 3,
    };

    const balanced: RaceStrategy = {
      stints: [
        {
          stint: 0,
          compound: TireCompound.MEDIUM,
          startLap: 1,
          targetEndLap: pit1,
          pushMode: 'MANAGE',
        },
        {
          stint: 1,
          compound: TireCompound.HARD,
          startLap: pit1 + 1,
          targetEndLap: laps,
          pushMode: 'SAVE',
        },
      ],
      pitWindows: [
        {
          stint: 0,
          earliest: pit1 - 3,
          latest: pit1 + 5,
          optimal: pit1 + 1,
          undercut: false,
          overcut: false,
        },
      ],
      targetLapTime: 93,
      underFuelThreshold: 4,
    };

    const conservative: RaceStrategy = {
      stints: [
        {
          stint: 0,
          compound: TireCompound.MEDIUM,
          startLap: 1,
          targetEndLap: pit1,
          pushMode: 'SAVE',
        },
        {
          stint: 1,
          compound: TireCompound.MEDIUM,
          startLap: pit1 + 1,
          targetEndLap: pit2,
          pushMode: 'MANAGE',
        },
        {
          stint: 2,
          compound: TireCompound.HARD,
          startLap: pit2 + 1,
          targetEndLap: laps,
          pushMode: 'SAVE',
        },
      ],
      pitWindows: [
        {
          stint: 0,
          earliest: pit1 - 2,
          latest: pit1 + 3,
          optimal: pit1,
          undercut: false,
          overcut: true,
        },
        {
          stint: 1,
          earliest: pit2 - 2,
          latest: pit2 + 4,
          optimal: pit2,
          undercut: true,
          overcut: false,
        },
      ],
      targetLapTime: 93.5,
      underFuelThreshold: 5,
    };

    void deg;
    return [aggressive, balanced, conservative];
  }

  optimizeStrategySlug(slug: string): Promise<RaceStrategy> {
    return this.generateStrategiesForSlug(slug).then((s) => s[1]);
  }
}
