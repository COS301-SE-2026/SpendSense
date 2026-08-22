import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MonthlyWrappedService {
    constructor(private readonly prisma: PrismaService) { }

    async getBadgesForMonth(userId: string, year: number, month: number) {
        
        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month, 1));

        const badges = await this.prisma.userBadge.findMany({
            where: {
                userId,
                earnedAt: {
                    gte: startDate,
                    lt: endDate,
                },
            },
            orderBy: {
                earnedAt: 'asc',
            },
            include: {
                badgeDefinition: {
                    select: {
                        code: true,
                        name: true,
                        description: true,
                        category: true,
                        iconKey: true,
                    },
                },
            },
        });

        return {
            year,
            month,
            badgesEarned: badges.length,
            badges: badges.map((badge) => ({
                badgeKey: badge.badgeDefinition.code,
                name: badge.badgeDefinition.name,
                description: badge.badgeDefinition.description,
                category: badge.badgeDefinition.category,
                iconKey: badge.badgeDefinition.iconKey,
                earnedAt: badge.earnedAt,
            })),
        };
    }
}