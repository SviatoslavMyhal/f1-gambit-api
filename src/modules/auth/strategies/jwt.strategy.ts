import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { User } from '../../users/entities/user.entity';
import { AuthService } from '../auth.service';

type JwtPayload = { sub: string; username: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly auth: AuthService,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'dev-change-me-in-production'),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    return this.auth.validateUserById(payload.sub);
  }
}
