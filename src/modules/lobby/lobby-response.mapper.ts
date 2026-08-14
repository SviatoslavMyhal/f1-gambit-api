import { Injectable, NotFoundException } from '@nestjs/common';
import { Track } from '../track/entities/track.entity';
import { User } from '../users/entities/user.entity';
import { Lobby } from './entities/lobby.entity';
import { LobbyStatus, WeatherCondition } from './lobby.types';
import type { PlayerConfig } from './lobby.types';

export type PublicUser = {
  id: string;
  username: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  racesCompleted: number;
  createdAt: Date;
  updatedAt: Date;
};

/** Plain JSON-safe lobby payload (no TypeORM metadata / no password hashes). */
export type LobbyResponse = {
  id: string;
  inviteCode: string;
  hostUserId: string;
  host?: PublicUser;
  opponentUserId: string | null;
  opponent: PublicUser | null;
  status: LobbyStatus;
  configTimeLimitMinutes: number;
  configDeadline: Date | string | null;
  trackId: string;
  track: Track;
  weather: WeatherCondition;
  simulationSeed: number;
  hostReady: boolean;
  opponentReady: boolean;
  hostConfig: PlayerConfig | null;
  opponentConfig: PlayerConfig | null;
  winnerUserId: string | null;
  simulationResult: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  configTimeRemainingSeconds: number | null;
};

/**
 * Maps ORM {@link Lobby} entities to API responses (serialization boundary).
 * Kept as injectable so controllers/services stay thin and mapping is testable in isolation.
 */
@Injectable()
export class LobbyResponseMapper {
  toLobbyResponse(lobby: Lobby): LobbyResponse {
    let configTimeRemainingSeconds: number | null = null;
    if (
      lobby.configDeadline != null &&
      lobby.status === LobbyStatus.CONFIGURING
    ) {
      const d =
        lobby.configDeadline instanceof Date
          ? lobby.configDeadline
          : new Date(lobby.configDeadline);
      if (!Number.isNaN(d.getTime())) {
        configTimeRemainingSeconds = Math.max(
          0,
          Math.floor((d.getTime() - Date.now()) / 1000),
        );
      }
    }

    if (!lobby.track) {
      throw new NotFoundException(`Lobby ${lobby.id} has no track loaded`);
    }

    return {
      id: lobby.id,
      inviteCode: lobby.inviteCode,
      hostUserId: lobby.hostUserId,
      host: lobby.host ? this.publicUser(lobby.host) : undefined,
      opponentUserId: lobby.opponentUserId,
      opponent: lobby.opponent ? this.publicUser(lobby.opponent) : null,
      status: lobby.status,
      configTimeLimitMinutes: lobby.configTimeLimitMinutes,
      configDeadline: lobby.configDeadline,
      trackId: lobby.trackId,
      track: this.plainTrack(lobby.track),
      weather: lobby.weather,
      simulationSeed: lobby.simulationSeed,
      hostReady: lobby.hostReady,
      opponentReady: lobby.opponentReady,
      hostConfig: lobby.hostConfig,
      opponentConfig: lobby.opponentConfig,
      winnerUserId: lobby.winnerUserId,
      simulationResult: lobby.simulationResult,
      createdAt: lobby.createdAt,
      updatedAt: lobby.updatedAt,
      configTimeRemainingSeconds,
    };
  }

  private publicUser(u: User): PublicUser {
    return {
      id: u.id,
      username: u.username,
      rating: u.rating,
      wins: u.wins,
      losses: u.losses,
      draws: u.draws,
      racesCompleted: u.racesCompleted,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }

  private plainTrack(t: Track): Track {
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      country: t.country,
      lengthKm: t.lengthKm,
      laps: t.laps,
      corners: t.corners,
      averageSpeedKph: t.averageSpeedKph,
      trackTemperatureC: t.trackTemperatureC,
      sectors: t.sectors,
      corners_data: t.corners_data,
      characteristics: t.characteristics,
    };
  }
}
