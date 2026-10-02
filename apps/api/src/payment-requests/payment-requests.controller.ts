import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CreatePaymentRequestDto } from './create-payment-request.dto';
import { PaymentRequestsService } from './payment-requests.service';

interface HttpStatusResponse {
  status(code: number): HttpStatusResponse;
}

@ApiTags('payment-requests')
@Controller('payment-requests')
export class PaymentRequestsController {
  constructor(private readonly paymentRequests: PaymentRequestsService) {}

  @Post()
  @ApiCreatedResponse({ description: 'Payment request created.' })
  @ApiOkResponse({ description: 'Existing payment request returned.' })
  async create(
    @Body() dto: CreatePaymentRequestDto,
    @Res({ passthrough: true }) response: HttpStatusResponse,
  ) {
    const result = await this.paymentRequests.create(dto);
    response.status(result.existing ? 200 : 201);
    return result;
  }
}
