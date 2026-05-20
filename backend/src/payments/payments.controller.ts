import { Body, Controller, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { LogPaymentDto } from './dto/log-payment.dto';

@Controller('payments') // this means the route starts with "/payments"
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('log') // this adds "/log" making it "/payments/log"
  logPayment(@Body() dto: LogPaymentDto) {
    return this.paymentsService.logPayment(dto);
  }
}