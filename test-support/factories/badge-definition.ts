/**
 * This factory facilitates the creation of badge "types" - aka definitions - 
 * that users could earn during e2e scenario's
*/

import type { BadgeCategory, BadgeCriteriaType, PrismaClient } from '../../backend/node_modules/@prisma/client';
import { randomUUID } from 'node:crypto';

type CreateBadgeDefinitionOverrides = {
    code?: string;
    name?: string;
    description?: string;
    category?: BadgeCategory;
    criteriaType?: BadgeCriteriaType;
    criteriaValue?: number;
    iconKey?: string | null;
    isActive?: boolean;
};

export async function createBadgeDefinition(prisma: PrismaClient, overrides: CreateBadgeDefinitionOverrides = {}) {
    const uniqueId = randomUUID();
    return prisma.badgeDefinition.create({
        data: {
            code: `E2E_TEST_BADGE_${uniqueId}`, // added the unique id because badsges need to have unique code names
            name: 'E2E Test Badge',
            description: 'Badge created for E2E testing',
            category: 'DEMO',
            criteriaType: 'FIRST_ON_TIME_PAYMENT',
            criteriaValue: 1,
            iconKey: 'e2e-test-badge',
            isActive: true,
            ...overrides,
        },
    });
}

/**
 * Example calls:
 * 
 * A default E2E Badge: 
 * const badge = await createBadgeDefinition(prisma);
 * 
 * A customised E2E badge:
 * const badge = await createBadgeDefinition(prisma, {
 *   name: 'Payment Starter',
 *   category: BadgeCategory.PAYMENT,
 *   }
 * );
 */