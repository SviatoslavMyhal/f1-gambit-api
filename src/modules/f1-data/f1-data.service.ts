import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErgastHttpClient } from './ergast-http.client';
import { F1ApiCache } from './f1-api-cache.entity';
import type {
  NormalizedDriver,
  NormalizedDriverStanding,
  NormalizedRace,
  NormalizedSeason,
  NormalizedTeam,
} from './f1-data.models';

const CACHE_TTL_MS = 1000 * 60 * 60 * 12;

type ConstructorStandingRow = {
  position: number;
  points: number;
  constructorId: string;
  name: string;
};

type DriverRow = {
  driverId: string;
  givenName: string;
  familyName: string;
  code: string;
};

@Injectable()
export class F1DataService {
  private readonly log = new Logger(F1DataService.name);
  private readonly client: ErgastHttpClient;
  private readonly memory = new Map<string, { at: number; payload: unknown }>();

  constructor(
    @InjectRepository(F1ApiCache)
    private readonly cache: Repository<F1ApiCache>,
    config: ConfigService,
  ) {
    const baseUrl =
      config.get<string>('F1_API_BASE_URL') ?? 'https://api.jolpi.ca/ergast';
    const timeoutMs = parseInt(
      config.get<string>('F1_API_TIMEOUT_MS') ?? '8000',
      10,
    );
    this.client = new ErgastHttpClient({ baseUrl, timeoutMs });
  }

  async getConstructorStandings(
    seasonYear: number,
  ): Promise<ConstructorStandingRow[]> {
    const path = `/f1/${seasonYear}/constructorStandings.json`;
    const raw = await this.getCached(path, () =>
      this.client.getJson<unknown>(path),
    );
    return this.normalizeConstructorStandings(raw);
  }

  /**
   * Driver championship standings (points, wins) — Ergast
   * `/f1/{year}/driverStandings.json` (via Jolpica mirror by default).
   */
  async getDriverStandings(
    seasonYear: number,
  ): Promise<NormalizedDriverStanding[]> {
    const path = `/f1/${seasonYear}/driverStandings.json`;
    const raw = await this.getCached(path, () =>
      this.client.getJson<unknown>(path),
    );
    return this.normalizeDriverStandings(raw);
  }

  async getDrivers(seasonYear: number): Promise<DriverRow[]> {
    const path = `/f1/${seasonYear}/drivers.json`;
    const raw = await this.getCached(path, () =>
      this.client.getJson<unknown>(path),
    );
    return this.normalizeDrivers(raw);
  }

  /** Season calendar + round metadata (Ergast `/{year}.json`). */
  async fetchSeason(year: number): Promise<NormalizedSeason> {
    const path = `/f1/${year}.json`;
    const raw = await this.getCached(path, () =>
      this.client.getJson<unknown>(path),
    );
    return this.normalizeSeason(year, raw);
  }

  /** Alias: constructor standings as normalized teams. */
  async fetchTeams(year: number): Promise<NormalizedTeam[]> {
    const rows = await this.getConstructorStandings(year);
    return rows.map((r) => ({
      constructorId: r.constructorId,
      name: r.name,
    }));
  }

  /** Alias: drivers for a season. */
  async fetchDrivers(year: number): Promise<NormalizedDriver[]> {
    return this.getDrivers(year);
  }

  /** Alias: driver championship standings (real F1 points table). */
  async fetchDriverStandings(
    year: number,
  ): Promise<NormalizedDriverStanding[]> {
    return this.getDriverStandings(year);
  }

  /** Race results for a specific round (Ergast `/{season}/{round}/results.json`). */
  async getRaceResults(season: number, round: number): Promise<unknown> {
    const path = `/f1/${season}/${round}/results.json`;
    return this.getCached(path, () => this.client.getJson<unknown>(path));
  }

  /** All circuits (Ergast `/circuits.json`). */
  async getCircuits(): Promise<unknown> {
    const path = `/f1/circuits.json`;
    return this.getCached(path, () => this.client.getJson<unknown>(path));
  }

  /** Points + position for a constructor ref (e.g. red_bull) from final standings. */
  async lookupConstructorSummary(
    seasonYear: number,
    constructorRef: string,
  ): Promise<{ position: number; points: number } | null> {
    const rows = await this.getConstructorStandings(seasonYear);
    const row = rows.find((r) => r.constructorId === constructorRef);
    return row
      ? { position: row.position, points: row.points }
      : null;
  }

  private async getCached(
    key: string,
    loader: () => Promise<unknown>,
  ): Promise<unknown> {
    const mem = this.memory.get(key);
    if (mem && Date.now() - mem.at < CACHE_TTL_MS) {
      return mem.payload;
    }

    const row = await this.cache.findOne({ where: { cacheKey: key } });
    if (row && Date.now() - row.updatedAt.getTime() < CACHE_TTL_MS) {
      this.memory.set(key, { at: Date.now(), payload: row.payload });
      return row.payload;
    }

    try {
      const payload = (await loader()) as object;
      await this.cache.upsert({ cacheKey: key, payload }, ['cacheKey']);
      this.memory.set(key, { at: Date.now(), payload });
      return payload;
    } catch (e) {
      this.log.warn(`F1 API fetch failed for ${key}: ${(e as Error).message}`);
      if (row?.payload) return row.payload;
      throw e;
    }
  }

  private normalizeConstructorStandings(raw: unknown): ConstructorStandingRow[] {
    const lists = (raw as { MRData?: { StandingsTable?: { StandingsLists?: unknown[] } } })
      ?.MRData?.StandingsTable?.StandingsLists;
    const first = Array.isArray(lists) ? lists[0] : undefined;
    const standings = (first as { ConstructorStandings?: unknown[] } | undefined)
      ?.ConstructorStandings;
    if (!Array.isArray(standings)) return [];

    return standings.map((s) => {
      const row = s as {
        position?: string;
        points?: string;
        Constructor?: { constructorId?: string; name?: string };
      };
      return {
        position: parseInt(String(row.position ?? '0'), 10),
        points: parseFloat(String(row.points ?? '0')),
        constructorId: String(row.Constructor?.constructorId ?? ''),
        name: String(row.Constructor?.name ?? ''),
      };
    });
  }

  private normalizeSeason(year: number, raw: unknown): NormalizedSeason {
    const racesRaw = (raw as { MRData?: { RaceTable?: { Races?: unknown[] } } })
      ?.MRData?.RaceTable?.Races;
    const races: NormalizedRace[] = [];
    if (Array.isArray(racesRaw)) {
      for (const r of racesRaw) {
        const row = r as {
          round?: string;
          raceName?: string;
          Circuit?: { circuitId?: string };
          date?: string;
        };
        races.push({
          round: parseInt(String(row.round ?? '0'), 10),
          raceName: String(row.raceName ?? ''),
          circuitId: String(row.Circuit?.circuitId ?? ''),
          date: String(row.date ?? ''),
        });
      }
    }
    return { year, races };
  }

  private normalizeDrivers(raw: unknown): DriverRow[] {
    const table = (raw as { MRData?: { DriverTable?: { Drivers?: unknown[] } } })
      ?.MRData?.DriverTable?.Drivers;
    if (!Array.isArray(table)) return [];
    return table.map((d) => {
      const row = d as {
        driverId?: string;
        givenName?: string;
        familyName?: string;
        code?: string;
      };
      return {
        driverId: String(row.driverId ?? ''),
        givenName: String(row.givenName ?? ''),
        familyName: String(row.familyName ?? ''),
        code: String(row.code ?? ''),
      };
    });
  }

  private normalizeDriverStandings(
    raw: unknown,
  ): NormalizedDriverStanding[] {
    const lists = (raw as { MRData?: { StandingsTable?: { StandingsLists?: unknown[] } } })
      ?.MRData?.StandingsTable?.StandingsLists;
    const first = Array.isArray(lists) ? lists[0] : undefined;
    const standings = (first as { DriverStandings?: unknown[] } | undefined)
      ?.DriverStandings;
    if (!Array.isArray(standings)) return [];

    return standings.map((s) => {
      const row = s as {
        position?: string;
        points?: string;
        wins?: string;
        Driver?: {
          driverId?: string;
          givenName?: string;
          familyName?: string;
          code?: string;
        };
        Constructors?: { constructorId?: string; name?: string }[];
      };
      const cons = Array.isArray(row.Constructors) ? row.Constructors[0] : undefined;
      return {
        position: parseInt(String(row.position ?? '0'), 10),
        points: parseFloat(String(row.points ?? '0')),
        wins: parseInt(String(row.wins ?? '0'), 10),
        driverId: String(row.Driver?.driverId ?? ''),
        givenName: String(row.Driver?.givenName ?? ''),
        familyName: String(row.Driver?.familyName ?? ''),
        code: String(row.Driver?.code ?? ''),
        constructorId: String(cons?.constructorId ?? ''),
        constructorName: String(cons?.name ?? ''),
      };
    });
  }
}
