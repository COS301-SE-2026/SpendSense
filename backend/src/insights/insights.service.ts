import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentOccurrenceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';


const SETTLED_PAYMENT_STATUSES: PaymentOccurrenceStatus[] = [PaymentOccurrenceStatus.PAID, PaymentOccurrenceStatus.PAID_LATE];
@Injectable()
export class InsightsService {

    constructor(private readonly prisma: PrismaService) { }

    // return settled payment occurances belonging to logged in user. 
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

    async getSettledPayments(supabaseAuthId: string) {

        const userId = await this.resolveUserId(supabaseAuthId);
    }
}
