import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OpenF1LapRow, OpenF1MeetingRow, OpenF1SessionRow } from './calibration.types';

@Injectable()
export class OpenF1HttpClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    this.baseUrl = (
      config.get<string>('OPENF1_BASE_URL') ?? 'https://api.openf1.org'
    ).replace(/\/$/, '');
    this.timeoutMs = parseInt(
      config.get<string>('OPENF1_TIMEOUT_MS') ?? '12000',
      10,
    );
  }

  private async fetchJson<T>(pathAndQuery: string): Promise<T> {
    const url = `${this.baseUrl}/v1/${pathAndQuery.replace(/^\//, '')}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`OpenF1 ${res.status}: ${text.slice(0, 400)}`);
      }
      return (text ? JSON.parse(text) : []) as T;
    } finally {
      clearTimeout(t);
    }
  }

  async meetingsForYear(year: number): Promise<OpenF1MeetingRow[]> {
    return this.fetchJson<OpenF1MeetingRow[]>(`meetings?year=${year}`);
  }

  async sessionsForMeeting(meetingKey: number): Promise<OpenF1SessionRow[]> {
    return this.fetchJson<OpenF1SessionRow[]>(
      `sessions?meeting_key=${meetingKey}`,
    );
  }

  async lapsForSession(sessionKey: number): Promise<OpenF1LapRow[]> {
    return this.fetchJson<OpenF1LapRow[]>(`laps?session_key=${sessionKey}`);
  }
}
