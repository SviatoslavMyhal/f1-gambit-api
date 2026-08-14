import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CarSetupDto } from './dto/car-setup.dto';
import { SetupService } from './setup.service';

@ApiTags('setup')
@Controller('sessions')
export class SetupController {
  constructor(private readonly setup: SetupService) {}

  @Post(':id/setup')
  @ApiOperation({ summary: 'Submit race engineer car setup (replaces legacy budget)' })
  submit(@Param('id') id: string, @Body() body: CarSetupDto) {
    return this.setup.submit(id, body);
  }
}
