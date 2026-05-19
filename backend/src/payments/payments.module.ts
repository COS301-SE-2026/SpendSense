import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

// PaymentsModule: payment logging and occurrence management
// TODO: implemetn PaymentsController and PaymentsService

//planned endpoints:
// POST /api/v1/payments/log
// GET /api/v1/payment-occurrences/upcoming

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService]
})
export class PaymentsModule {}
