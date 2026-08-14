import { Injectable } from '@nestjs/common';
import * as Lib from '../engine/car-dynamics.lib';

/**
 * Nest façade over deterministic car-dynamics math (for DI, tests, future calibration).
 */
@Injectable()
export class CarDynamicsService {
  lateralGFromSpeedRadius(speedKph: number, radiusM: number): number {
    return Lib.lateralGFromSpeedRadius(speedKph, radiusM);
  }

  radiusFromSpeedAndLateralG(speedKph: number, lateralG: number): number {
    return Lib.radiusFromSpeedAndLateralG(speedKph, lateralG);
  }

  longitudinalG(throttle01: number, brake01: number): number {
    return Lib.longitudinalG(throttle01, brake01);
  }

  slipAngleDeg(lateralG: number, grip01: number, jitter: number): number {
    return Lib.slipAngleDeg(lateralG, grip01, jitter);
  }

  brakeTemperatureC(
    brake01: number,
    tireWearPercent: number,
    lap: number,
    brakeBiasFront: number,
  ): number {
    return Lib.brakeTemperatureC(
      brake01,
      tireWearPercent,
      lap,
      brakeBiasFront,
    );
  }

  trackPosition01(sectorIndex: number, tInSector: number): number {
    return Lib.trackPosition01(sectorIndex, tInSector);
  }
}
