import { Injectable } from '@nestjs/common';
import type { TireCompound } from '../../setup/dto/tire-compound';
import * as Adv from '../engine/tire-model-advanced.lib';
import * as Base from '../engine/tire-model';

/**
 * Nest façade: base wear/grip + advanced IMO temperatures and per-corner wear.
 */
@Injectable()
export class TireModelService {
  tireWearToDelta(wearPercent: number): number {
    return Base.tireWearToDelta(wearPercent);
  }

  gripFromWear(wearPercent: number, compound: TireCompound): number {
    return Base.gripFromWear(wearPercent, compound);
  }

  baseWearIncrement(compound: TireCompound, trackDegMult: number): number {
    return Base.baseWearIncrement(compound, trackDegMult);
  }

  wearIncrementPerCorner(
    baseLapWear: number,
    cornerThermalLoad: number,
    lateralG: number,
    trackDegMult: number,
  ): number {
    return Adv.wearIncrementPerCorner(
      baseLapWear,
      cornerThermalLoad,
      lateralG,
      trackDegMult,
    );
  }

  tireTemperaturesIMO(
    trackTempC: number,
    wearPercent: number,
    compound: TireCompound,
    overheatingRisk01: number,
  ): Adv.TireTemperatureTriplet {
    return Adv.tireTemperaturesIMO(
      trackTempC,
      wearPercent,
      compound,
      overheatingRisk01,
    );
  }

  overheatingFlag(
    temps: Adv.TireTemperatureTriplet,
    compound: TireCompound,
  ): boolean {
    return Adv.overheatingFlag(temps, compound);
  }
}
