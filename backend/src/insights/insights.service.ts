import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentOccurrenceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';


const SETTLED_PAYMENT_STATUSES: PaymentOccurrenceStatus[] = [PaymentOccurrenceStatus.PAID, PaymentOccurrenceStatus.PAID_LATE];
@Injectable()
export class InsightsService {

    constructor(private readonly prisma: PrismaService) { }

    // convert auth id into payment occurance table userId
    private async resolveUserId(supabaseAuthId: string): Promise<string> {
        const user = await this.prisma.user.findUnique({
            where: {
                supabaseAuthId,
            },
            select: {
                id: true,
            },
        });

        if (!user) {
            throw new NotFoundException("SpendSense user profile could not be found");
        }
        return user.id;
    }

    // FUNCTION - GET THE SETTLED PAYMENTS
    async getSettledPayments(supabaseAuthId: string) {

        const userId = await this.resolveUserId(supabaseAuthId);
        const settledPayments = await this.prisma.paymentOccurrence.findMany({
            where: {
                userId,
                deletedAt: null,
                status: { in: SETTLED_PAYMENT_STATUSES },
                obligation: { is: { deletedAt: null } },
            },
            select: {
                id: true,
                obligationId: true,
                dueDate: true,
                amountDue: true,
                currency: true,
                status: true,
                sequenceNumber: true,
                paidAt: true,
                obligation: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        type: true,
                        status: true,
                        priority: true,
                        amount: true,
                        currency: true,
                        category: {
                            select: {
                                id: true,
                                name: true,
                                iconKey: true,
                                colourKey: true,
                            },
                        },
                    },
                },
                payment: {
                    select: {
                        id: true,
                        amountPaid: true,
                        paidDate: true,
                        paymentStatus: true,
                        daysLate: true,
                        simulatedInterest: true,
                        notes: true,
                    },
                },
            },

            orderBy: [{ paidAt: "desc" }, { dueDate: "desc" }],
        });

        const payments = settledPayments.map((occurrence) => ({
            id: occurrence.id,
            obligationId: occurrence.obligationId,
            dueDate: occurrence.dueDate,
            amountDue: Number(occurrence.amountDue),
            currency: occurrence.currency,
            status: occurrence.status,
            sequenceNumber: occurrence.sequenceNumber,
            paidAt: occurrence.paidAt,

            obligation:
            {
                ...occurrence.obligation,
                amount: Number(occurrence.obligation.amount),
            },

            payment: occurrence.payment ?
                {
                    ...occurrence.payment,
                    amountPaid: Number(occurrence.payment.amountPaid),
                    simulatedInterest: Number(occurrence.payment.simulatedInterest),
                }
                : null,
        }));

        return {
            count: payments.length,
            payments,
        };
    }
}

