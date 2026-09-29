import {
  Controller,
  Get,
  NotFoundException,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  HorizonAccountNotFoundError,
  HorizonUnavailableError,
} from './horizon.client';
import { CheckTrustlineDto } from './check-trustline.dto';
import { TrustlinesService } from './trustlines.service';

@ApiTags('trustlines')
@Controller('trustlines')
export class TrustlinesController {
  constructor(private readonly trustlines: TrustlinesService) {}

  @Get('check')
  @ApiOkResponse({ description: 'Trustline status for an account and asset.' })
  async check(@Query() query: CheckTrustlineDto) {
    try {
      return await this.trustlines.check(query);
    } catch (error) {
      if (error instanceof HorizonAccountNotFoundError) {
        throw new NotFoundException({
          code: 'ACCOUNT_NOT_FOUND',
          message:
            'The Stellar account does not exist on the configured Horizon.',
        });
      }

      if (error instanceof HorizonUnavailableError) {
        throw new ServiceUnavailableException({
          code: 'TRUSTLINE_CHECK_UNAVAILABLE',
          message:
            'The trustline could not be checked because Horizon is unavailable.',
        });
      }

      throw error;
    }
  }
}
