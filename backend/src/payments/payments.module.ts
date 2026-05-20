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

/**
 * Users Logs a Payment against a due occurance
 *  - PaymentRecord is created
 *  - PaymentOccurrence status is updated
 *  - daysLate is calculated
 *  - simulatedInterest is calculated if late
 *  - ScoreEvent is created
 *  - CreditProfile is updated
 *  - UserEvent is created
 *  - GamificationProfile is updated
 *  - RewardTransaction is created if coins/xp awarded
 *  - UserBadge progress is checked
 *  - Notification may be created
 */