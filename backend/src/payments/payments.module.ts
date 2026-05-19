import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaModule } from '../prisma/prisma.module';

// PaymentsModule: payment logging and occurrence management
// TODO: implemetn PaymentsController and PaymentsService

//planned endpoints:
// POST /api/v1/payments/log
// GET /api/v1/payment-occurrences/upcoming

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController],
  providers: [PaymentsService]
})
export class PaymentsModule { }
