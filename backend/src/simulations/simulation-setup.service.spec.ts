import { BadRequestException, ConflictException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { SimulationsService } from './simulations.service';

const sessionId = '00000000-0000-4000-8000-000000000020';
const idempotencyKey = '00000000-0000-4000-8000-000000000021';
const createdAt = new Date('2026-09-15T10:00:00.000Z');

type UpdateArgs = {
  data: {
    status: string;
    currentBalance: string;
    savingsBalance: string;
    nextDayAt: Date | null;
    scenarioSnapshot: { selectedAllocation: { id: string } };
  };
};

type UpdatedSession = {
  id: string;
  status: string;
  timedMode: boolean;
  currentDay: number;
  daysInMonth: number;
  nextDayAt: Date | null;
  startingBudget: string;
  currentBalance: string;
  savingsBalance: string;
  score: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  presentationHold: string;
};

type Transaction = {
  simulationSession: {
    updateMany: jest.Mock<Promise<{ count: number }>, [UpdateArgs]>;
    findUniqueOrThrow: jest.Mock<Promise<UpdatedSession>, [unknown]>;
  };
  simulationAction: {
    findFirst: jest.Mock<Promise<unknown>, [unknown]>;
    create: jest.Mock<Promise<{ id: string }>, [unknown]>;
  };
};

type TransactionCallback = (transaction: Transaction) => Promise<unknown>;

function briefingSession(status = 'BRIEFING') {
  return {
    id: sessionId,
    status,
    timedMode: true,
    startingBudget: '6000.00',
    scenarioSnapshot: {
      allocationOptions: [
        {
          id: 'current_80_savings_20',
          label: '80% Current / 20% Savings',
          currentAmount: '4800.00',
          savingsAmount: '1200.00',
        },
        {
          id: 'current_70_savings_30',
          label: '70% Current / 30% Savings',
          currentAmount: '4200.00',
          savingsAmount: '1800.00',
        },
      ],
      customAllocation: {
        enabled: true,
        minCurrentAmount: '0.00',
        maxCurrentAmount: '6000.00',
        increment: '50.00',
      },
    },
  };
}

function updatedSession(): UpdatedSession {
  return {
    id: sessionId,
    status: 'ACTIVE',
    timedMode: true,
    currentDay: 0,
    daysInMonth: 30,
    nextDayAt: new Date('2026-09-15T10:00:15.000Z'),
    startingBudget: '6000.00',
    currentBalance: '4200.00',
    savingsBalance: '1800.00',
    score: '0.00',
    createdAt,
    updatedAt: createdAt,
    completedAt: null,
    presentationHold: 'NONE',
  };
}

describe('SimulationsService setupSession', () => {
  let prisma: {
    simulationSession: { findFirst: jest.Mock<Promise<unknown>, [unknown]> };
    simulationAction: { findFirst: jest.Mock<Promise<unknown>, [unknown]> };
    $transaction: jest.Mock<Promise<unknown>, [TransactionCallback]>;
  };
  let transaction: Transaction;
  let service: SimulationsService;

  beforeEach(() => {
    transaction = {
      simulationSession: {
        updateMany: jest
          .fn<Promise<{ count: number }>, [UpdateArgs]>()
          .mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest
          .fn<Promise<UpdatedSession>, [unknown]>()
          .mockResolvedValue(updatedSession()),
      },
      simulationAction: {
        findFirst: jest
          .fn<Promise<unknown>, [unknown]>()
          .mockResolvedValue(null),
        create: jest
          .fn<Promise<{ id: string }>, [unknown]>()
          .mockResolvedValue({ id: 'action-setup-1' }),
      },
    };
    prisma = {
      simulationSession: {
        findFirst: jest
          .fn<Promise<unknown>, [unknown]>()
          .mockResolvedValue(briefingSession()),
      },
      simulationAction: {
        findFirst: jest
          .fn<Promise<unknown>, [unknown]>()
          .mockResolvedValue(null),
      },
      $transaction: jest
        .fn<Promise<unknown>, [TransactionCallback]>()
        .mockImplementation((callback) => callback(transaction)),
    };
    service = new SimulationsService(prisma as unknown as PrismaService);
  });

  it('activates a briefing with a saved default allocation and timed deadline', async () => {
    const result = await service.setupSession(
      'user-1',
      sessionId,
      { allocationId: 'current_70_savings_30' },
      idempotencyKey,
    );

    expect(result.session.status).toBe('ACTIVE');
    expect(result.allocation).toEqual({
      id: 'current_70_savings_30',
      label: '70% Current / 30% Savings',
      currentAmount: '4200.00',
      savingsAmount: '1800.00',
    });
    expect(result.replayed).toBe(false);

    const update = transaction.simulationSession.updateMany.mock.calls[0][0];
    expect(update.data.status).toBe('ACTIVE');
    expect(update.data.currentBalance).toBe('4200.00');
    expect(update.data.savingsBalance).toBe('1800.00');
    expect(update.data.nextDayAt).toBeInstanceOf(Date);
    expect(update.data.scenarioSnapshot.selectedAllocation.id).toBe(
      'current_70_savings_30',
    );
    expect(transaction.simulationAction.create).toHaveBeenCalledTimes(1);
  });

  it('accepts a valid R50 custom fictional Current amount', async () => {
    const result = await service.setupSession(
      'user-1',
      sessionId,
      { currentAmount: '4250.00' },
      idempotencyKey,
    );

    expect(result.allocation).toEqual({
      id: 'custom_current_4250_00',
      label: 'Custom: R4250.00 Current / R1750.00 Savings',
      currentAmount: '4250.00',
      savingsAmount: '1750.00',
    });
  });

  it('rejects missing, mixed, and invalid custom allocation input before mutation', async () => {
    await expect(
      service.setupSession('user-1', sessionId, {}, idempotencyKey),
    ).rejects.toThrow(
      new BadRequestException('EXACTLY_ONE_ALLOCATION_REQUIRED'),
    );
    await expect(
      service.setupSession(
        'user-1',
        sessionId,
        { allocationId: 'current_70_savings_30', currentAmount: '4200.00' },
        idempotencyKey,
      ),
    ).rejects.toThrow(
      new BadRequestException('EXACTLY_ONE_ALLOCATION_REQUIRED'),
    );
    await expect(
      service.setupSession(
        'user-1',
        sessionId,
        { currentAmount: '4255.00' },
        idempotencyKey,
      ),
    ).rejects.toThrow(new BadRequestException('SIMULATION_ALLOCATION_INVALID'));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('replays the saved setup result for the same idempotency key and payload', async () => {
    prisma.simulationAction.findFirst.mockResolvedValue({
      payloadHash:
        '8a047a81c71e513cc59b5c1444735dc47f006bed94da004ed5d5017882e74994',
      responseSnapshot: {
        session: { id: sessionId },
        allocation: { id: 'current_70_savings_30' },
        replayed: false,
      },
    });

    await expect(
      service.setupSession(
        'user-1',
        sessionId,
        { allocationId: 'current_70_savings_30' },
        idempotencyKey,
      ),
    ).resolves.toEqual({
      session: { id: sessionId },
      allocation: { id: 'current_70_savings_30' },
      replayed: true,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects setup after the session is no longer a briefing', async () => {
    prisma.simulationSession.findFirst.mockResolvedValue(
      briefingSession('ACTIVE'),
    );

    await expect(
      service.setupSession(
        'user-1',
        sessionId,
        { allocationId: 'current_70_savings_30' },
        idempotencyKey,
      ),
    ).rejects.toThrow(new ConflictException('SETUP_ALREADY_CONFIRMED'));
  });
});
