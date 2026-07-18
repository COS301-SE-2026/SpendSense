import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { InsightsService } from './insights.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InsightsService', () => {
    let service: InsightsService;

    const prismaMock = {
        user: {
            findUnique: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InsightsService,
                {
                    provide: PrismaService,
                    useValue: prismaMock,
                },
            ],
        }).compile();
        service = module.get<InsightsService>(InsightsService);
        jest.clearAllMocks();
    });

    describe('resolveUserId', () => {
        it('should return the internal user ID when the user exists', async () => {
            const supabaseAuthId = 'supabase-user-123';
            const internalUserId = 'internal-user-456';
            prismaMock.user.findUnique.mockResolvedValue({id: internalUserId});
            const result = await service['resolveUserId'](supabaseAuthId);
            expect(result).toBe(internalUserId);
            expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
                where: {
                    supabaseAuthId,
                },
                select: {
                    id: true,
                },
            });
            expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(1);
        });

        it('should throw NotFoundException when the user does not exist', async () => {
            const supabaseAuthId = 'unknown-supabase-user';
            prismaMock.user.findUnique.mockResolvedValue(null);
            await expect(service['resolveUserId'](supabaseAuthId)).rejects.toThrow(NotFoundException);
            await expect(service['resolveUserId'](supabaseAuthId)).rejects.toThrow("SpendSense user profile could not be found");
        });
    });
});