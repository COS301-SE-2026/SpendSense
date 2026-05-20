import {Injectable, NotFoundException} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
import {PaymentOccurrenceStatus} from '@prisma/client';
import {UpcomingOccurrencesDto} from './dto/upcoming-occurrences.dto';

@Injectable()
export class PaymentOccurrencesService{
    constructor(private readonly prisma: PrismaService){}

    // upcomming list
    async upcoming(userId: string, query: UpcomingOccurrencesDto){
        const {page, perPage, from, to, status, obligationId} = query;
        const skip = (page - 1) * perPage;

        const fromDate = from? new Date(from) : new Date();
        const toDate = to? new Date(to) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const statusFilter: PaymentOccurrenceStatus[] = status? 
            (status.split(',').map((s)=> s.trim()) as PaymentOccurrenceStatus[]) : [PaymentOccurrenceStatus.PENDING, PaymentOccurrenceStatus.OVERDUE];

        const where={
            userId,
            deletedAt: null,
            dueDate: {gte: fromDate, lte: toDate},
            status: {in: statusFilter},
            ...(obligationId? {obligationId} : {}),
        };

        const [occurrences, total] = await Promise.all([
            this.prisma.paymentOccurrence.findMany({
                where,
                skip,
                take: perPage,
                orderBy: {dueDate: 'asc'},
                include:{
                obligation:{
                    select: {id: true, name: true, type: true, priority: true},
                },
                reminders:{
                    where: {deletedAt: null},
                    select: {id: true, scheduledFor: true, status: true, channel: true},
                },
                },
            }),
        this.prisma.paymentOccurrence.count({where}),
        ]);

        const now = new Date();
        const data = occurrences.map((o)=>{
            const daysUntilDue = Math.ceil(
                (o.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );
            
            return{
                id: o.id,
                dueDate: o.dueDate,
                amountDue: Number(o.amountDue),
                currency: o.currency,
                status: o.status,
                sequenceNumber: o.sequenceNumber,
                daysUntilDue,
                riskLevel: getRiskLevel(daysUntilDue, o.status),
                obligation: o.obligation,
                reminders: o.reminders,
            };
        });

        return{
            data,
            meta: { page, perPage, total, totalPages: Math.ceil(total / perPage)},
        };
    }

    // detail
    async findOne(userId: string, id: string){
        const occurrence = await this.prisma.paymentOccurrence.findFirst({

            where: {id, userId, deletedAt: null},
            include:{
                obligation:{
                select: {id: true, name: true, type: true, priority: true},
                },
                payment: true,
                reminders:{
                where: {deletedAt: null},
                select: {id: true, scheduledFor: true, status: true, channel: true},
                },
            },
        });

        if(!occurrence){
            throw new NotFoundException('Payment occurrence not found');
        }

        return{
            data:{
                occurrence:{
                id: occurrence.id,
                dueDate: occurrence.dueDate,
                amountDue: Number(occurrence.amountDue),
                currency: occurrence.currency,
                status: occurrence.status,
                sequenceNumber: occurrence.sequenceNumber,
                paidAt: occurrence.paidAt,
                overdueAt: occurrence.overdueAt,
                missedAt: occurrence.missedAt,
                },

                obligation: occurrence.obligation,
                paymentRecord: occurrence.payment?
                {
                    id: occurrence.payment.id,
                    amountPaid: Number(occurrence.payment.amountPaid),
                    paidDate: occurrence.payment.paidDate,
                    paymentStatus: occurrence.payment.paymentStatus,
                    daysLate: occurrence.payment.daysLate,
                } : null,
                scoreRisk:{
                    estimatedPenaltyIfMissed: -12,
                    estimatedPenaltyIfLate: -5,
                    explanation:
                        'Late or missed payments can reduce your simulated financial health score.',
                },
                reminders: occurrence.reminders,
            },
        };
    }

    async findOwnedOccurrenceOrThrow(userId: string, occurrenceId: string){
        const occurrence = await this.prisma.paymentOccurrence.findFirst({
            where: {id: occurrenceId, userId, deletedAt: null},
        });
        
        if(!occurrence){
            throw new NotFoundException('Payment occurrence not found');
        }
        return occurrence;
    }

    async assertOccurrencePayable(occurrence:{status: PaymentOccurrenceStatus; id: string;}){
        const unpayable: PaymentOccurrenceStatus[]=[
            PaymentOccurrenceStatus.PAID,
            PaymentOccurrenceStatus.PAID_LATE,
            PaymentOccurrenceStatus.CANCELLED,
            PaymentOccurrenceStatus.MISSED,
        ];

        if(unpayable.includes(occurrence.status)){
            throw new NotFoundException('Payment occurrence is not in a payable state');
        }
    }

    async markOccurrencePaid(occurrenceId: string, isOnTime: boolean, paidAt: Date,){
        return this.prisma.paymentOccurrence.update({
            where: {id: occurrenceId},
            data:{
                status: isOnTime? PaymentOccurrenceStatus.PAID : PaymentOccurrenceStatus.PAID_LATE,
                paidAt,
            },
        });
    }
}

// helper for risk lvl
function getRiskLevel(daysUntilDue: number, status: PaymentOccurrenceStatus,): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'{
    if(status === PaymentOccurrenceStatus.OVERDUE){
        return 'CRITICAL';
    }
    if(daysUntilDue <= 1){
        return 'HIGH';
    }
    if(daysUntilDue <= 3){
        return 'MEDIUM';
    }
    return 'LOW';
}