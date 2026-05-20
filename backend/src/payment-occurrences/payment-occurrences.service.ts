import { Injectable } from '@nestjs/common';
import { PaymentOccurrenceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';


@Injectable()
export class PaymentOccurrencesService {

    constructor(private readonly prisma: PrismaService) {}

    async findUpcoming(userId: string) {
        const now = new Date() ; // get the current date/time

        return this.prisma.paymentOccurrence.findMany({
            where: {

                userId,
                dueDate: {
                    gte: now,
                },

                status: PaymentOccurrenceStatus.PENDING || PaymentOccurrenceStatus.OVERDUE , // if a paymentOccurance's due date is in the future, natrually statsu should be pending
                deletedAt: null, // it should not ahve been deteled 
            },
            orderBy: { dueDate: 'asc'}, 
        });
    }
}
