import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrepareRegistrationDto } from './prepare-registration.dto';
import { RegistryService } from './registry.service';
import { SubmitRegistrationDto } from './submit-registration.dto';

@ApiTags('registry')
@Controller('registry')
export class RegistryController {
  constructor(private readonly registry: RegistryService) {}

  @Post('prepare')
  prepare(@Body() dto: PrepareRegistrationDto) {
    return this.registry.prepare(dto.requestId, dto.registrant);
  }

  @Post('submit')
  submit(@Body() dto: SubmitRegistrationDto) {
    return this.registry.submit(dto.requestId, dto.signedXdr);
  }

  @Get(':requestId')
  get(@Param('requestId') requestId: string) {
    return this.registry.get(requestId);
  }
}
