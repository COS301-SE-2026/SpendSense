import{
    Injectible,
    NotFoundException,
    BadRequestException,
}from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
import{
    Currency,
    ObligationPriority,
    ObligationStatus,
    PaymentOccurrenceStatus,
    ReminderChannel,
    ReminderStatus,
    ScheduleFrequency,
    UserEventSourceType,
    UserEventType,
}from '@prisma/client';
import {CreateObligationDto} from './dto/create-obligation.dto';

const OCCURRENCE_HORIZON_MONTHS = 6;

@Injectable()
export class ObligationsService{
    constructor(private readonly prisma: PrismaService){}

    async create(userId: string, dto: CreateObligationDto){
        // validate that category actually exists
        const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
        });

        if(!category){
        throw new NotFoundException('Category not found');
        }

        // validate the date logic
        if(dto.endDate && new Date(dto.endDate)<=new Date(dto.startDate)){
            throw new BadRequestException('End date must be after start date');
        }
        if(dto.amount <= 0){
            throw new BadRequestException('Amount must be greater than zero');
        }
        if(dto.schedule.frequency === ScheduleFrequency.FIXED_INSTALLMENT && !dto.schedule.totalOccurrences){
            throw new BadRequestException('Total occurrences is required for fixed installments',);
        }

        return this.prisma.$transaction(async (tx)=>{
        const obligation = await tx.financialObligation.create({
            data:{
                userId,
                categoryId: dto.categoryId,
                name: dto.name,
                description: dto.description,
                type: dto.type,
                status: ObligationStatus.ACTIVE,
                amount: dto.amount,
                currency: dto.currency ?? Currency.ZAR,
                priority: dto.priority ?? ObligationPriority.MEDIUM,
                startDate: new Date(dto.startDate),
                endDate: dto.endDate ? new Date(dto.endDate) : null,
            },
            include: {category: {select: {id: true, name: true, iconKey: true}}},
        });

        const schedule = await tx.paymentSchedule.create({
            data:{
                obligationId: obligation.id,
                frequency: dto.schedule.frequency,
                interval: dto.schedule.interval ?? 1,
                dayOfMonth: dto.schedule.dayOfMonth ?? null,
                startDate: new Date(dto.startDate),
                endDate: dto.endDate? new Date(dto.endDate): null,
                totalOccurrences: dto.schedule.totalOccurrences ?? null,
                isActive: true,
            },
        });

        const occurrenceDates = generateOccurrenceDates(
            dto.schedule.frequency,
            dto.schedule.interval ?? 1,
            dto.schedule.dayOfMonth,
            new Date(dto.startDate),
            dto.endDate ? new Date(dto.endDate): null,
            dto.schedule.totalOccurrences ?? null,
        );

        const occurrences = await Promise.all(
            occurrenceDates.map((dueDate, index)=>
            tx.paymentOccurrence.create({
                data: {
                userId,
                obligationId: obligation.id,
                scheduleId: schedule.id,
                dueDate,
                amountDue: dto.amount,
                currency: dto.currency ?? Currency.ZAR,
                status: PaymentOccurrenceStatus.PENDING,
                sequenceNumber: index + 1,
                },
            }),
            ),
        );

        const remindersEnabled = dto.reminders?.enabled !== false;
        const daysBefore = dto.reminders?.daysBefore ?? [3];
        const channels = dto.reminders?.channels ?? [ReminderChannel.IN_APP];

        const createdReminders = [];
        if(remindersEnabled){
            for(const occurrence of occurrences){
                for(const days of daysBefore){
                    const scheduledFor = new Date(occurrence.dueDate);
                    scheduledFor.setDate(scheduledFor.getDate() - days);

                    if(scheduledFor > new Date()){
                    const reminder = await tx.reminder.create({
                        data:{
                        userId,
                        occurrenceId: occurrence.id,
                        channel: channels[0] ?? ReminderChannel.IN_APP,
                        scheduledFor,
                        status: ReminderStatus.SCHEDULED,
                        priority: obligation.priority,
                        message: `${obligation.name} is due in ${days} day${days === 1 ? '' : 's'}.`,
                        },
                    });
                    createdReminders.push(reminder);
                    }
                }
            }
        }

        const event = await tx.userEvent.create({
            data:{
            userId,
            eventType: UserEventType.OBLIGATION_CREATED,
            sourceType: UserEventSourceType.FINANCIAL_OBLIGATION,
            sourceId: obligation.id,
            },
        });

        return{
            obligation,
            schedule,
            generatedOccurrences: occurrences.map((o)=>({
            id: o.id,
            dueDate: o.dueDate,
            amountDue: Number(o.amountDue),
            status: o.status,
            sequenceNumber: o.sequenceNumber,
            })),

            createdReminders: createdReminders.map((r)=>({
            id: r.id,
            occurrenceId: r.occurrenceId,
            channel: r.channel,
            scheduledFor: r.scheduledFor,
            status: r.status,
            })),

            event:{
            type: event.eventType,
            sourceType: event.sourceType,
            sourceId: event.sourceId,
            },
        };
        });
    }
}

// helpers - occurrence generation
function generateOccurrenceDates(
        frequency: ScheduleFrequency,
        interval: number,
        dayOfMonth: number | null | undefined,
        startDate: Date,
        endDate: Date | null,
        totalOccurrences: number | null,): Date[]{

    const dates: Date[] = [];
    const horizonEnd = endDate ?? addMonths(new Date(), OCCURRENCE_HORIZON_MONTHS);

    if(frequency === ScheduleFrequency.ONCE){
        dates.push(new Date(startDate));
        return dates;
    }

    if(frequency === ScheduleFrequency.FIXED_INSTALLMENT){
        const count = totalOccurrences ?? 1;
        let current = resolveFirstOccurrence(startDate, dayOfMonth);

        for(let i = 0; i < count; i++){
            dates.push(new Date(current));
            current = addMonths(current, interval);
        }
        return dates;
    }

    if(frequency === ScheduleFrequency.MONTHLY){
        let current = resolveFirstOccurrence(startDate, dayOfMonth);

        while(current <= horizonEnd){
            dates.push(new Date(current));
            current = addMonths(current, interval);
        }
        return dates;
    }

    if(frequency === ScheduleFrequency.WEEKLY){
        let current = new Date(startDate);

        while(current <= horizonEnd){
            dates.push(new Date(current));
            current = new Date(current);
            current.setDate(current.getDate() + 7 * interval);
        }
        return dates;
    }

    return dates;
}

function resolveFirstOccurrence(startDate: Date, dayOfMonth?: number | null): Date{
    if(!dayOfMonth){
        return new Date(startDate);
    }

    const safeDay = Math.min(dayOfMonth, 28);
    const d = new Date(startDate);
    d.setDate(safeDay);

    if(d < startDate){
        d.setMonth(d.getMonth() + 1);
    }

    return d;
}

function addMonths(date: Date, months: number): Date{
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    
    return d;
}