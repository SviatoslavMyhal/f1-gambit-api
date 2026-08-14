import { Injectable } from '@nestjs/common';
import { CarSetupDto } from '../setup/dto/car-setup.dto';
import {
  COMPOUND_PROFILE,
  TireCompound,
} from '../setup/dto/tire-compound';
import { Track } from '../track/entities/track.entity';
import { TrackService } from '../track/track.service';
import { WeatherCondition, type PlayerConfig } from '../lobby/lobby.types';
import { raceStrategyDtoToRaceStrategy } from '../simulation/race-strategy.mapper';
import type { RaceStrategyDto } from '../simulation/dto/race-strategy.dto';
import type { AiConfigDto } from './dto/ai-config.dto';
import type { AIPersonality } from './ai.types';

export type AIAdvice = {
  overallAssessment: string;
  suggestions: Array<{
    parameter: string;
    current: unknown;
    suggested: unknown;
    reason: string;
  }>;
  riskLevel: 'low' | 'medium' | 'high';
};

@Injectable()
export class AIService {
  constructor(private readonly tracks: TrackService) {}

  async generateForUser(userId: string, dto: AiConfigDto): Promise<PlayerConfig> {
    const track = await this.tracks.findBySlug(dto.trackSlug);
    return this.generateConfig(
      track,
      dto.weather,
      dto.personality ?? 'balanced',
      userId,
    );
  }

  async generateConfig(
    track: Track,
    weather: WeatherCondition,
    personality: AIPersonality = 'balanced',
    userId: string,
  ): Promise<PlayerConfig> {
    const setup = this.generateSetup(track, weather, personality);
    const strategy = this.generateStrategy(track, weather, setup, personality);
    return {
      userId,
      setup,
      strategy,
      submittedAt: new Date().toISOString(),
    };
  }

  async getAdvice(
    trackSlug: string,
    weather: WeatherCondition,
    currentSetup: CarSetupDto,
  ): Promise<AIAdvice> {
    const track = await this.tracks.findBySlug(trackSlug);
    const optimal = this.generateSetup(track, weather, 'balanced');

    const keys = Object.keys(optimal) as (keyof CarSetupDto)[];
    const suggestions = keys
      .filter((key) => {
        const a = currentSetup[key];
        const b = optimal[key];
        if (typeof a === 'number' && typeof b === 'number') {
          return Math.abs(a - b) > 1;
        }
        return a !== b;
      })
      .map((key) => ({
        parameter: key,
        current: currentSetup[key],
        suggested: optimal[key],
        reason: this.getParamReason(key, track, weather),
      }));

    return {
      overallAssessment:
        suggestions.length === 0
          ? 'Setup looks well-optimised for this circuit and conditions.'
          : `${suggestions.length} parameter${suggestions.length > 1 ? 's' : ''} could be improved.`,
      suggestions,
      riskLevel: this.assessRisk(currentSetup, track),
    };
  }

  private generateSetup(
    track: Track,
    weather: WeatherCondition,
    personality: AIPersonality,
  ): CarSetupDto {
    const chars = track.characteristics;
    const baseWing = Math.round(chars.aeroSensitivity * 10);

    const personalities: Record<AIPersonality, Partial<CarSetupDto>> = {
      aggressive: {
        frontWing: Math.min(11, baseWing + 1),
        rearWing: Math.min(11, baseWing + 1),
        suspensionStiffness: Math.min(10, 7),
        brakeBias: 63,
        rideHeight: 2,
        differentialOnThrottle: 85,
        fuelLoad: 0,
      },
      balanced: {
        frontWing: baseWing,
        rearWing: baseWing,
        suspensionStiffness: 5,
        brakeBias: 58,
        rideHeight: 5,
        differentialOnThrottle: 70,
        fuelLoad: 2,
      },
      conservative: {
        frontWing: Math.max(1, baseWing - 1),
        rearWing: Math.max(1, baseWing - 1),
        suspensionStiffness: 3,
        brakeBias: 55,
        rideHeight: 8,
        differentialOnThrottle: 60,
        fuelLoad: 4,
      },
      random: {
        frontWing: this.randInt(1, 11),
        rearWing: this.randInt(1, 11),
        suspensionStiffness: this.randInt(1, 10),
        brakeBias: this.randInt(52, 66),
        rideHeight: this.randInt(1, 10),
        differentialOnThrottle: this.randInt(50, 100),
        fuelLoad: this.randInt(0, 5),
      },
    };

    const base = personalities[personality];

    if (weather === WeatherCondition.WET) {
      return {
        ...(base as CarSetupDto),
        startingCompound: TireCompound.WET,
        fuelLoad: Math.min(5, (base.fuelLoad ?? 2) + 1),
      };
    }

    if (weather === WeatherCondition.MIXED) {
      return {
        ...(base as CarSetupDto),
        startingCompound: TireCompound.INTER,
      };
    }

    const compound =
      personality === 'aggressive'
        ? TireCompound.SOFT
        : personality === 'conservative'
          ? TireCompound.HARD
          : chars.tireDegradationMultiplier > 0.8
            ? TireCompound.MEDIUM
            : TireCompound.SOFT;

    return { ...(base as CarSetupDto), startingCompound: compound };
  }

  private generateStrategy(
    track: Track,
    _weather: WeatherCondition,
    setup: CarSetupDto,
    personality: AIPersonality,
  ) {
    const profile = COMPOUND_PROFILE[setup.startingCompound];
    const deg =
      profile.degradationRate * track.characteristics.tireDegradationMultiplier;
    const lapsOnTire = Math.max(
      8,
      Math.min(track.laps - 8, Math.floor(35 / Math.max(0.04, deg * 5))),
    );
    const optimal = Math.min(track.laps - 5, Math.max(10, lapsOnTire));

    const windows: Record<AIPersonality, [number, number]> = {
      aggressive: [Math.max(5, optimal - 5), optimal],
      balanced: [Math.max(5, optimal - 3), Math.min(track.laps - 5, optimal + 3)],
      conservative: [optimal, Math.min(track.laps - 4, optimal + 5)],
      random: [this.randInt(10, 30), this.randInt(31, Math.min(45, track.laps - 5))],
    };

    const dto: RaceStrategyDto = {
      startingCompound: setup.startingCompound,
      pitWindow: windows[personality],
      fuelLoad: setup.fuelLoad,
      aggressionLevel:
        personality === 'aggressive'
          ? 8
          : personality === 'conservative'
            ? 3
            : 5,
      safetyCarReaction: personality === 'aggressive' ? 'pit' : 'stay',
    };

    return raceStrategyDtoToRaceStrategy(dto, track.laps);
  }

  private getParamReason(
    param: keyof CarSetupDto,
    track: Track,
    weather: WeatherCondition,
  ): string {
    const reasons: Partial<Record<keyof CarSetupDto, string>> = {
      frontWing: `Track aero sensitivity is ${track.characteristics.aeroSensitivity.toFixed(2)} — adjust accordingly`,
      rearWing:
        weather === WeatherCondition.WET
          ? 'Wet conditions benefit from more rear downforce balance'
          : 'Balance top speed vs cornering',
      brakeBias:
        'Brake bias affects lock-up risk — check compound thermal sensitivity',
      fuelLoad: `Degradation multiplier is ${track.characteristics.tireDegradationMultiplier} — fuel affects lap times by 0.034s/lap/kg`,
    };
    return reasons[param] ?? 'Optimise for track characteristics';
  }

  private assessRisk(setup: CarSetupDto, track: Track): 'low' | 'medium' | 'high' {
    let riskScore = 0;
    if (setup.rideHeight < 3) riskScore += 2;
    if (setup.brakeBias < 54) riskScore += 2;
    if (setup.fuelLoad === 0) riskScore += 1;
    if (track.characteristics.tireDegradationMultiplier > 0.95 && setup.fuelLoad < 2) {
      riskScore += 1;
    }
    return riskScore >= 4 ? 'high' : riskScore >= 2 ? 'medium' : 'low';
  }

  private randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
