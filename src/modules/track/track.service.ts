import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { TrackModel } from '../simulation/engine/simulation.engine';
import type { TrackReferenceEntry } from './track-reference-metrics';
import { TRACK_REFERENCE_METRICS } from './track-reference-metrics';
import { Track } from './entities/track.entity';

@Injectable()
export class TrackService {
  constructor(
    @InjectRepository(Track)
    private readonly repo: Repository<Track>,
  ) {}

  async findAll(): Promise<Track[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findBySlug(slug: string): Promise<Track> {
    const t = await this.repo.findOne({ where: { slug } });
    if (!t) throw new NotFoundException(`Track ${slug} not found`);
    return t;
  }

  async findById(id: string): Promise<Track> {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException(`Track id ${id} not found`);
    return t;
  }

  /** Random circuit for multiplayer lobby assignment. */
  async getRandomTrack(): Promise<Track> {
    const row = await this.repo
      .createQueryBuilder('t')
      .orderBy('RANDOM()')
      .getOne();
    if (!row) throw new NotFoundException('No tracks seeded');
    return row;
  }

  /** Static reference laps / sector norms for optional simulate comparisons. */
  async referencesForSlug(slug: string): Promise<{
    trackSlug: string;
    references: TrackReferenceEntry[];
  }> {
    await this.findBySlug(slug);
    return {
      trackSlug: slug,
      references: TRACK_REFERENCE_METRICS[slug] ?? [],
    };
  }

  toTrackModel(t: Track): TrackModel {
    return {
      slug: t.slug,
      laps: t.laps,
      corners: t.corners,
      trackTemperatureC: t.trackTemperatureC,
      averageSpeedKph: t.averageSpeedKph,
      sectors: t.sectors,
      corners_data: t.corners_data,
      characteristics: t.characteristics,
    };
  }
}
