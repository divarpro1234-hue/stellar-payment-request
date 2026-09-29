import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CalculateXlmUsdDto } from './calculator.dto';
import { CalculatorService } from './calculator.service';

@ApiTags('calculator')
@Controller('calculator')
export class CalculatorController {
  constructor(private readonly calculator: CalculatorService) {}

  @Get('xlm-usd')
  @ApiOkResponse({ description: 'Reference value of an XLM amount in USD.' })
  calculate(@Query() query: CalculateXlmUsdDto) {
    return this.calculator.calculate(query);
  }
}
