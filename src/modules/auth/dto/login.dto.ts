import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Username or email' })
  @IsString()
  usernameOrEmail!: string;

  @ApiProperty()
  @IsString()
  password!: string;
}
