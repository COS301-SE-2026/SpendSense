import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogPaymentDto } from './dto/log-payment.dto';

@Injectable()
export class PaymentsService {
    constructor(private readonly prisma: PrismaService) { }

    async logPayment(dto: LogPaymentDto) {
        // below means "go to the "PaymentOccurance" table and find the row where 'id' = 'occuranceId' 
        // NOTE AGAIN - this 'occuranceId' is passed from the frontent
        const occurrence = await this.prisma.paymentOccurrence.findUnique({
            where: {
                id: dto.occurrenceId,
            },
        });

        if (!occurrence) {
            throw new NotFoundException('The occuranceId Could not be found')
        }

        return {
            message: 'Success. Users payment has been logged',
            occurrence,
        };
    }
}