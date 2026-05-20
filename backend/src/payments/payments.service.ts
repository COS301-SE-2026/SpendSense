import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentOccurrenceStatus, PaymentRecordStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LogPaymentDto } from './dto/log-payment.dto';

// This is the pa
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
            throw new NotFoundException('The occuranceId Cold not be found')
        }

        if (occurrence.status === PaymentOccurrenceStatus.PAID || occurrence.status === PaymentOccurrenceStatus.PAID_LATE) {
            throw new BadRequestException("Error. There is already and existing payment for this occuranceId.")
        }
        
        if (occurrence.status === PaymentOccurrenceStatus.MISSED || occurrence.status === PaymentOccurrenceStatus.CANCELLED) {
            throw new BadRequestException("This Occurance Has Been Missed Or cancelled, User cannot try pay for ti.")
        }

        // for demo 1, we're assuming the idea clinet that pays the expected amount due: 
        const amountPaid = new Prisma.Decimal(dto.amountPaid);
        if (!amountPaid.equals(occurrence.amountDue)) {
            throw new BadRequestException(
                `Amount paid must equal the amount due. Expected ${occurrence.amountDue.toString()}, received ${amountPaid.toString()}.`,
            );
        }



        // Calculating weather or not this payment is happening on time or - if not - how may days late it is 
        const paidDate = new Date(dto.paidDate);
        const isLate = paidDate.getTime() > occurrence.dueDate.getTime();
        const daysLate = isLate ? ((paidDate.getTime() - occurrence.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

        const paymentRecord = await this.prisma.paymentRecord.create({
            data: {
                userId: occurrence.userId,
                occurrenceId: occurrence.id,
                obligationId: occurrence.obligationId,
                amountPaid,
                currency: occurrence.currency,
                paidDate,
                paymentStatus: isLate ? PaymentRecordStatus.LATE : PaymentRecordStatus.ON_TIME,
                daysLate,
                simulatedInterest: 0,
                notes: dto.notes,
            },
        });


        // belowe we are updating the STTAUS of the Occurance:
        const updateOccurrence = await this.prisma.paymentOccurrence.update({
            where: {
                id: occurrence.id,
            },
            data: {
                status: isLate ? PaymentOccurrenceStatus.PAID_LATE : PaymentOccurrenceStatus.PAID,
                paidAt: paidDate,
            },
        });

        return {
            message: 'Success. Users payment has been logged',
            paymentRecord,
            occurrence: updateOccurrence,
            isLate,
            daysLate,
        };
    }
}

/**
 * Test cases 
 * 1. Successeful test case where user is making a payment for an existing financial oblication
 * 2. The occuranceId doe snot exist
 * 3. The user is trting to make a payment, but the Record already Exists in 'Payment Record' 
 */