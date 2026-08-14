import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import type { AuthResponse } from './auth.types';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const takenName = await this.users.findOne({
      where: { username: dto.username },
    });
    if (takenName) {
      throw new ConflictException('username already taken');
    }
    const takenEmail = await this.users.findOne({ where: { email: dto.email } });
    if (takenEmail) {
      throw new ConflictException('email already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.users.save(
      this.users.create({
        username: dto.username,
        email: dto.email,
        passwordHash,
      }),
    );

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findOne({
      where: [{ username: dto.usernameOrEmail }, { email: dto.usernameOrEmail }],
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  async validateUserById(userId: string): Promise<User> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Token invalid or expired');
    return user;
  }

  private buildAuthResponse(user: User): AuthResponse {
    const payload = { sub: user.id, username: user.username };
    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        rating: user.rating,
        wins: user.wins,
        losses: user.losses,
        racesCompleted: user.racesCompleted,
      },
    };
  }
}
