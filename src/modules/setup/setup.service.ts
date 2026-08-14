import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SessionsService } from '../sessions/sessions.service';
import { CarSetupDto } from './dto/car-setup.dto';

@Injectable()
export class SetupService {
  constructor(private readonly sessions: SessionsService) {}

  async submit(sessionId: string, raw: unknown) {
    const dto = plainToInstance(CarSetupDto, raw);
    const errors = await validate(dto);
    if (errors.length) {
      throw new UnprocessableEntityException({
        message: 'Invalid car setup',
        errors: errors.map((e) => ({
          property: e.property,
          constraints: e.constraints,
        })),
      });
    }

    const warnings: string[] = [];
    if (dto.frontWing + dto.rearWing > 18 && dto.rideHeight < 4) {
      warnings.push('High combined wing with low ride height may increase porpoising risk.');
    }
    if (dto.brakeBias < 54) {
      warnings.push('Rearward brake bias increases lock-up risk in slow corners.');
    }

    await this.sessions.updateCarSetup(sessionId, dto as unknown as Record<string, unknown>);

    const session = await this.sessions.findOne(sessionId);
    return {
      setup: dto,
      validationWarnings: warnings,
      strategyRecommendations: [
        'Consider medium + hard for balanced deg on high-deg circuits.',
        'Soft + hard if qualifying simulation prioritizes early pace.',
      ],
    };
  }
}
