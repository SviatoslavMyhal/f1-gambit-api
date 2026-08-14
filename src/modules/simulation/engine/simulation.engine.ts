import type { CarSetupDto } from '../../setup/dto/car-setup.dto';
import {
  COMPOUND_PROFILE,
  TireCompound,
} from '../../setup/dto/tire-compound';
import type {
  AdvancedLapTelemetry,
  SessionTelemetry,
  TelemetrySamplePoint,
} from '../../telemetry/telemetry.types';
import type { RaceStrategy } from '../strategy/race-strategy';
import {
  brakeTemperatureC,
  lateralGFromSpeedRadius,
  longitudinalG,
  radiusFromSpeedAndLateralG,
  slipAngleDeg,
  trackPosition01,
} from './car-dynamics.lib';
import { computeDriverMetrics } from './driver-model.lib';
import { SeededRandom } from './seeded-random';
import {
  baseWearIncrement,
  gripFromWear,
  tireWearToDelta,
} from './tire-model';
import { overheatingFlag, tireTemperaturesIMO } from './tire-model-advanced.lib';
import { averageRaceTotalForTrack } from '../../track/track-reference-metrics';
import {
  computeGridRaceResult,
  type GridRaceOutcome,
} from './race-competition.lib';

export type TrackModel = {
  slug: string;
  laps: number;
  corners: number;
  trackTemperatureC: number;
  averageSpeedKph: number;
  sectors: {
    sector: 1 | 2 | 3;
    type: 'technical' | 'highspeed' | 'mixed';
    lengthKm: number;
    baseTime: number;
  }[];
  corners_data: {
    number: number;
    speedKph: number;
    lateralG: number;
    brakingZoneM: number;
    tireThermalLoad: number;
  }[];
  characteristics: {
    aeroSensitivity: number;
    mechanicalGripWeight: number;
    tireDegradationMultiplier: number;
    overtakingDifficulty: number;
    safetyCarProbability: number;
  };
};

/** Deterministic per-track scales from OpenF1 calibration (applied to raw sector times). */
export type LapCalibrationScales = {
  sectorScales: [number, number, number];
};

export type RaceState = {
  tireWear: number;
  compound: TireCompound;
  stint: number;
  tireAge: number;
  trackTemp: number;
  fuelKg: number;
  pitStopThisLap: boolean;
};

export type SimulationEngineResult = {
  telemetry: SessionTelemetry;
  totalRaceTimeSeconds: number;
  bestLapSeconds: number;
} & GridRaceOutcome;

const FUEL_KG_PER_LAP = 1.6;
const FUEL_TIME_PER_KG = 0.034;

const MAX_CORNERS_WEAR = 16;
const TELEMETRY_SAMPLES_PER_LAP = 3;

function fnv1aSessionSalt(sessionId: string): number {
  let h = 2166136261;
  for (let i = 0; i < sessionId.length; i++) {
    h ^= sessionId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class SimulationEngine {
  /** Same for both cars in multiplayer — safety car & shared traffic per lap. */
  private readonly sharedRng: SeededRandom;
  /** Per-session stream — setup/sector noise, lock-ups, wear variance. */
  private readonly carRng: SeededRandom;
  private readonly seedNumber: number;
  private readonly sessionSalt: number;

  constructor(
    private readonly setup: CarSetupDto,
    private readonly track: TrackModel,
    private readonly strategy: RaceStrategy,
    seed: number,
    private readonly sessionId: string,
    private readonly options?: {
      gridSize?: number;
      calibration?: LapCalibrationScales;
    },
  ) {
    this.seedNumber = seed >>> 0;
    this.sessionSalt = fnv1aSessionSalt(sessionId);
    this.sharedRng = new SeededRandom(this.seedNumber);
    this.carRng = new SeededRandom((this.seedNumber ^ this.sessionSalt) >>> 0);
  }

  /** Isolated RNG for telemetry-only features (does not affect lap-time RNG stream). */
  private auxRng(lap: number, salt: number): SeededRandom {
    const x = Math.imul(lap ^ salt, 0x9e3779b9) ^ this.seedNumber;
    return new SeededRandom(x >>> 0);
  }

  run(): SimulationEngineResult {
    const totalLaps = this.track.laps;
    const lapTimes: SessionTelemetry['lapTimes'] = [];
    const tireData: SessionTelemetry['tireData'] = [];
    const sectorSplits: SessionTelemetry['sectorSplits'] = [];
    const events: SessionTelemetry['events'] = [];
    const strategySnaps: SessionTelemetry['strategy'] = [];
    const advancedLaps: AdvancedLapTelemetry[] = [];
    const telemetryStream: TelemetrySamplePoint[] = [];

    let compound = this.setup.startingCompound;
    let tireWear = 2;
    let tireAge = 0;
    let stint = 0;
    let fuelKg = 110 + this.setup.fuelLoad * 5;
    let totalRace = 0;
    const bestSector = { s1: 1e9, s2: 1e9, s3: 1e9 };
    let sessionBestLap = 1e9;
    const recentLapTimes: number[] = [];

    const pitWindow = this.strategy.pitWindows[0];
    if (pitWindow) {
      strategySnaps.push({
        stint: 0,
        startLap: 1,
        endLap: totalLaps,
        compound,
        pitLap: pitWindow.optimal,
        pitWindowOptimal: [pitWindow.earliest, pitWindow.latest],
        undercut: pitWindow.undercut,
        overcut: pitWindow.overcut,
      });
    }

    for (let lap = 1; lap <= totalLaps; lap++) {
      const state: RaceState = {
        tireWear,
        compound,
        stint,
        tireAge,
        trackTemp: this.track.trackTemperatureC,
        fuelKg,
        pitStopThisLap: false,
      };

      const sectorTimes = this.track.sectors.map((s) =>
        this.simulateSector(s, lap, state),
      );
      const cal = this.options?.calibration?.sectorScales;
      let s1 = sectorTimes[0] ?? 0;
      let s2 = sectorTimes[1] ?? 0;
      let s3 = sectorTimes[2] ?? 0;
      if (cal) {
        s1 *= cal[0];
        s2 *= cal[1];
        s3 *= cal[2];
      }
      const baseLap = s1 + s2 + s3;

      const fuelDelta = FUEL_TIME_PER_KG * fuelKg;
      const tireDelta = tireWearToDelta(tireWear);
      const trafficDelta = this.sharedRng.gaussian(0, 0.025);
      const setupDelta = this.calculateSetupDelta();

      let lapTime = baseLap + fuelDelta + tireDelta + trafficDelta + setupDelta;

      const scRoll =
        this.sharedRng.next() <
        this.track.characteristics.safetyCarProbability / totalLaps;
      if (scRoll) {
        lapTime += 45;
        events.push({
          lap,
          type: 'SAFETY_CAR',
          description: 'Safety Car deployed',
          impactSeconds: 45,
          data: {},
        });
      }

      const lockRisk = this.resolveLockUpRisk(state);
      if (this.carRng.next() < lockRisk) {
        const loss = 0.15 + this.carRng.next() * 0.25;
        lapTime += loss;
        events.push({
          lap,
          type: 'LOCK_UP',
          description: 'Front lock-up',
          impactSeconds: loss,
          data: { brakeBias: this.setup.brakeBias },
        });
      }

      const oh = this.resolveOverheatRisk(state);
      if (oh > 0.7) {
        lapTime += 0.08;
        events.push({
          lap,
          type: 'TIRE_OVERHEAT',
          description: 'Rear tire overheating',
          impactSeconds: 0.08,
          data: {},
        });
      }

      totalRace += lapTime;

      if (s1 < bestSector.s1) bestSector.s1 = s1;
      if (s2 < bestSector.s2) bestSector.s2 = s2;
      if (s3 < bestSector.s3) bestSector.s3 = s3;

      const fuelCorrected = lapTime - FUEL_TIME_PER_KG * fuelKg * 0.3;

      sessionBestLap = Math.min(sessionBestLap, lapTime);

      lapTimes.push({
        lap,
        timeSeconds: lapTime,
        delta: lapTime - sessionBestLap,
        isPersonalBest: Math.abs(lapTime - sessionBestLap) < 1e-5,
        compound,
        tireAge,
        fuelCorrected,
      });

      recentLapTimes.push(lapTime);
      if (recentLapTimes.length > 12) recentLapTimes.shift();

      const wearBefore = tireWear;
      const degMult = this.track.characteristics.tireDegradationMultiplier;
      const base = baseWearIncrement(compound, degMult);
      const rFactor = 1 + this.carRng.next() * 0.08;
      const lapWearTarget = base * rFactor * 0.15;

      const cornersToUse = this.track.corners_data.slice(
        0,
        Math.min(this.track.corners_data.length, MAX_CORNERS_WEAR),
      );
      const tireWearPerCornerAvg =
        cornersToUse.length > 0 ? lapWearTarget / cornersToUse.length : 0;

      tireWear = Math.min(100, tireWear + lapWearTarget);
      const tireWearPerLap = tireWear - wearBefore;

      const grip = gripFromWear(tireWear, compound);
      const temps = tireTemperaturesIMO(
        this.track.trackTemperatureC,
        tireWear,
        compound,
        oh,
      );
      const overheating = overheatingFlag(temps, compound);

      tireData.push({
        lap,
        compound,
        wearPercent: tireWear,
        grainPercent:
          compound === TireCompound.SOFT || compound === TireCompound.INTER
            ? Math.min(100, tireWear * 0.9)
            : tireWear * 0.3,
        overheatingRisk: oh,
        gripLevel: grip,
        projectedFailureLap:
          tireWear > 90 ? lap + 3 : tireWear > 87 ? lap + 8 : null,
        tireWearPerLap,
        tireWearPerCornerAvg,
        tireTemperature: {
          innerC: temps.innerC,
          middleC: temps.middleC,
          outerC: temps.outerC,
        },
        overheating,
      });

      sectorSplits.push({
        lap,
        sector1: s1,
        sector2: s2,
        sector3: s3,
        sector1Delta: s1 - bestSector.s1,
        sector2Delta: s2 - bestSector.s2,
        sector3Delta: s3 - bestSector.s3,
      });

      const sectorDeltaVsBest: [number, number, number] = [
        s1 - bestSector.s1,
        s2 - bestSector.s2,
        s3 - bestSector.s3,
      ];

      const mini1: [number, number, number] = [
        s1 * 0.33,
        s1 * 0.33,
        s1 * 0.34,
      ];
      const mini2: [number, number, number] = [
        s2 * 0.33,
        s2 * 0.33,
        s2 * 0.34,
      ];
      const mini3: [number, number, number] = [
        s3 * 0.33,
        s3 * 0.33,
        s3 * 0.34,
      ];

      const highSpeedSectors = this.track.sectors.filter(
        (s) => s.type === 'highspeed',
      ).length;
      const topSpeedPerStraight =
        this.track.averageSpeedKph * (1.05 + highSpeedSectors * 0.02) +
        (100 - grip) * 8;
      const accelerationZones = Math.min(
        24,
        Math.max(4, Math.floor(this.track.corners * 0.35) + stint * 2),
      );

      const drvRng = this.auxRng(lap, 0x4d);
      const driverMetrics = computeDriverMetrics(
        lap,
        recentLapTimes.slice(-10),
        drvRng,
        this.setup,
      );

      advancedLaps.push({
        lap,
        sectors: [
          {
            sector: 1,
            timeSeconds: s1,
            deltaVsBest: sectorDeltaVsBest[0] ?? 0,
            miniSectorTimes: [...mini1],
          },
          {
            sector: 2,
            timeSeconds: s2,
            deltaVsBest: sectorDeltaVsBest[1] ?? 0,
            miniSectorTimes: [...mini2],
          },
          {
            sector: 3,
            timeSeconds: s3,
            deltaVsBest: sectorDeltaVsBest[2] ?? 0,
            miniSectorTimes: [...mini3],
          },
        ],
        sectorDeltaVsBest,
        miniSectorTimes: [mini1[0], mini2[0], mini3[0]],
        topSpeedPerStraight,
        accelerationZones,
        tireWearPerLap,
        tireWearPerCornerAvg,
        tireTemperature: {
          innerC: temps.innerC,
          middleC: temps.middleC,
          outerC: temps.outerC,
        },
        tireOverheating: overheating,
        driverMetrics,
      });

      for (let k = 0; k < TELEMETRY_SAMPLES_PER_LAP; k++) {
        const tInSector = (k + 0.5) / TELEMETRY_SAMPLES_PER_LAP;
        const sectorIndex = k % 3;
        const tp = trackPosition01(sectorIndex, tInSector);
        const sector = this.track.sectors[sectorIndex];
        const spd =
          sector?.type === 'highspeed'
            ? topSpeedPerStraight * (0.92 + k * 0.02)
            : this.track.averageSpeedKph * (0.75 + grip * 0.2);
        const thr = Math.min(
          1,
          Math.max(0, 0.55 + grip * 0.35 + (k - 1) * 0.08),
        );
        const brk = k === 0 ? 0.35 * (1 - grip * 0.5) : 0;
        const latG = lateralGFromSpeedRadius(
          spd,
          radiusFromSpeedAndLateralG(spd, 2.8 + (1 - grip) * 0.8),
        );
        const longG = longitudinalG(thr, brk);
        const slip = slipAngleDeg(latG, grip, (k - 1) * 0.12);
        const sample: TelemetrySamplePoint = {
          lap,
          trackPosition: (lap - 1 + tp) / totalLaps,
          speedKph: spd,
          throttle: thr,
          brake: brk,
          lateralG: latG,
          longitudinalG: longG,
          slipAngleDeg: slip,
          brakeTemperatureC: brakeTemperatureC(
            brk,
            tireWear,
            lap,
            this.setup.brakeBias,
          ),
          tireWear,
          gripLevel: grip,
          tireTemp: {
            inner: temps.innerC,
            middle: temps.middleC,
            outer: temps.outerC,
          },
        };
        telemetryStream.push(sample);
      }

      const ev = this.auxRng(lap, 0x45);
      if (ev.next() < 0.03 * (1.1 - grip)) {
        events.push({
          lap,
          type: 'WHEEL_SPIN',
          description: 'Rear wheel spin on traction',
          impactSeconds: 0.04,
          data: { gripLevel: grip },
        });
      }
      if (lap > 8 && ev.next() < 0.025 + this.track.characteristics.overtakingDifficulty * 0.02) {
        events.push({
          lap,
          type: 'DIRTY_AIR_LOSS',
          description: 'Aero loss in turbulent air',
          impactSeconds: 0.06,
          data: { lossDownforcePct: 8 + ev.next() * 6 },
        });
      }
      if (
        this.track.sectors.some((s) => s.type === 'highspeed') &&
        ev.next() < 0.22
      ) {
        events.push({
          lap,
          type: 'DRS_ACTIVATION',
          description: 'DRS open — straight',
          impactSeconds: 0,
          data: { enabled: true },
        });
      }

      tireAge += 1;
      fuelKg = Math.max(2, fuelKg - FUEL_KG_PER_LAP);

      const shouldPit =
        tireWear > 87 ||
        (pitWindow && lap >= pitWindow.latest && stint === 0) ||
        (pitWindow && lap === pitWindow.optimal && tireWear > 55);

      if (shouldPit && stint === 0 && lap < totalLaps - 2) {
        events.push({
          lap,
          type: 'PIT_STOP',
          description: 'Pit stop — compound change',
          impactSeconds: 22,
          data: { compoundOut: compound },
        });
        stint = 1;
        compound = TireCompound.HARD;
        tireWear = 5;
        tireAge = 0;
        totalRace += 22;
      }

      if (lapTimes[lapTimes.length - 1]?.isPersonalBest) {
        events.push({
          lap,
          type: 'FASTEST_LAP',
          description: 'Session best lap',
          impactSeconds: 0,
          data: {},
        });
      }
    }

    const speedTrace = this.buildSpeedTrace();

    const telemetry: SessionTelemetry = {
      sessionId: this.sessionId,
      trackSlug: this.track.slug,
      totalLaps,
      lapTimes,
      tireData,
      speedTrace,
      sectorSplits,
      events,
      strategy: strategySnaps,
      advancedLaps,
      telemetryStream,
    };

    const gridSize = this.options?.gridSize ?? 20;
    const fieldBaselineSeconds = averageRaceTotalForTrack(this.track.slug);
    const grid = computeGridRaceResult(totalRace, {
      gridSize,
      seedNumber: this.seedNumber,
      trackSlug: this.track.slug,
      fieldBaselineSeconds,
    });

    return {
      telemetry,
      totalRaceTimeSeconds: totalRace,
      bestLapSeconds: sessionBestLap,
      ...grid,
    };
  }

  private simulateSector(
    sector: TrackModel['sectors'][0],
    lap: number,
    state: RaceState,
  ): number {
    const wingAvg = (this.setup.frontWing + this.setup.rearWing) / 22;
    let aeroFactor = 1;
    if (sector.type === 'technical') {
      aeroFactor =
        1 +
        (wingAvg - 0.5) * this.track.characteristics.aeroSensitivity * 0.12;
    } else if (sector.type === 'highspeed') {
      aeroFactor = 1 + (this.setup.rearWing / 11) * 0.16;
    } else {
      aeroFactor = 1 + (wingAvg - 0.45) * 0.06;
    }

    const mechFactor =
      1 +
      (this.setup.suspensionStiffness > 7
        ? (this.setup.suspensionStiffness - 7) *
          this.track.characteristics.mechanicalGripWeight *
          0.02
        : 0);

    const tireGrip = gripFromWear(state.tireWear, state.compound);
    const tempFactor =
      1 -
      COMPOUND_PROFILE[state.compound].thermalSensitivity *
        Math.max(0, (state.trackTemp - 35) / 40) *
        0.04;

    const noise = this.carRng.gaussian(0, 0.08);
    return (
      sector.baseTime *
        aeroFactor *
        mechFactor *
        (0.85 + tireGrip * 0.2) *
        tempFactor +
      noise
    );
  }

  private calculateSetupDelta(): number {
    const wingSum = this.setup.frontWing + this.setup.rearWing;
    const aeroPenalty =
      Math.abs(wingSum / 22 - this.track.characteristics.aeroSensitivity) * 0.8;
    const suspensionPenalty =
      this.setup.suspensionStiffness > 7
        ? (this.setup.suspensionStiffness - 7) *
          this.track.characteristics.mechanicalGripWeight *
          0.15
        : 0;
    const ridePenalty = this.setup.rideHeight < 3 ? 0.12 : 0;
    return aeroPenalty * 0.01 + suspensionPenalty * 0.01 + ridePenalty;
  }

  private resolveLockUpRisk(state: RaceState): number {
    const bias = this.setup.brakeBias;
    const base = bias < 54 ? 0.04 : 0.008;
    return base + state.tireWear * 0.0012;
  }

  private resolveOverheatRisk(state: RaceState): number {
    const p = COMPOUND_PROFILE[state.compound];
    return (
      p.thermalSensitivity * (state.trackTemp / 50) * (state.tireWear / 100)
    );
  }

  private buildSpeedTrace(): SessionTelemetry['speedTrace'] {
    const traceRng = new SeededRandom(
      (this.seedNumber ^ 0xaceeacee ^ this.sessionSalt) >>> 0,
    );
    const trace: SessionTelemetry['speedTrace'] = [];
    const corners = this.track.corners_data.slice(0, this.track.corners);
    const grip = 0.88;
    for (const c of corners) {
      const wing = (this.setup.frontWing + this.setup.rearWing) / 22;
      const adj = 1 + (wing - 0.5) * 0.05;
      const mid = c.speedKph * adj;
      const radiusM = radiusFromSpeedAndLateralG(mid, c.lateralG);
      const latG = lateralGFromSpeedRadius(mid, radiusM);
      const throttle01 = Math.min(
        1,
        Math.max(0, 0.62 + traceRng.next() * 0.35),
      );
      const brake01 =
        traceRng.next() < 0.32
          ? Math.min(1, 0.35 + traceRng.next() * 0.6)
          : 0;
      const slip = slipAngleDeg(latG, grip, (traceRng.next() - 0.5) * 0.2);
      const brakeTemp = brakeTemperatureC(
        brake01,
        45,
        20,
        this.setup.brakeBias,
      );
      trace.push({
        corner: c.number,
        entrySpeedKph: c.speedKph * adj * 0.92,
        midCornerSpeedKph: mid,
        exitSpeedKph: c.speedKph * adj * 1.04,
        throttlePercent: throttle01 * 100,
        brakePercent: brake01 * 100,
        lateralG: latG,
        longitudinalG: longitudinalG(throttle01, brake01),
        slipAngleDeg: slip,
        brakeTemperatureC: brakeTemp,
      });
    }
    return trace;
  }
}
