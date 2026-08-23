/**
 * This factory now facilitates the process of a user earning  abadge 
 */

import { PrismaClient } from '@prisma/client';

type CreateUserBadgeInput = {
    userId: string;
    badgeDefinitionId: string;
    progress?: number;
    earnedAt?: Date | null;
};

export async function createUserBadge(prisma: PrismaClient, input: CreateUserBadgeInput) {
    return prisma.userBadge.create({
        data: {
            userId: input.userId,
            badgeDefinitionId: input.badgeDefinitionId,
            progress: input.progress ?? 1,
            earnedAt: input.earnedAt ?? new Date(), // this si the important part for testing the wrapped functionality
        },
    });
}

/**
 * Example call:
 * 
 * await createUserBadge(prisma, {
 *      userId: user.id,
 *      badgeDefinitionId: badge.id,
 *      earnedAt: new Date('2026-08-05T10:00:00.000Z'),
 * });
 */