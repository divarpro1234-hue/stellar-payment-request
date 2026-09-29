import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { CreatePaymentRequestDto } from './create-payment-request.dto';
import { PaymentRequestsService } from './payment-requests.service';

@ApiTags('payment-requests')
@Controller('payment-requests')
export class PaymentRequestsController {
  constructor(private readonly paymentRequests: PaymentRequestsService) {}

  @Post()
  @ApiCreatedResponse({ description: 'Payment request created.' })
  create(@Body() dto: CreatePaymentRequestDto) {
    return this.paymentRequests.create(dto);
  }
}
