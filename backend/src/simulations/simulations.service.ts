import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  Prisma,
  SimulationActionType,
  SimulationSessionStatus,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { isUUID } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSimulationDto } from './dto/create-simulation.dto';
import {
  buildSimulationScenario,
  type SimulationScenario,
} from './simulation-scenario-builder';

const resumableStatuses = [
  SimulationSessionStatus.BRIEFING,
  SimulationSessionStatus.ACTIVE,
  SimulationSessionStatus.PAUSED,
];

const simulationSummarySelect = {
  id: true,
  status: true,
  timedMode: true,
  currentDay: true,
  daysInMonth: true,
  nextDayAt: true,
  startingBudget: true,
  currentBalance: true,
  savingsBalance: true,
  score: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
} satisfies Prisma.SimulationSessionSelect;

type StoredCreationAction = {
  payloadHash: string;
  responseSnapshot: unknown;
};

type BriefingResponse = {
  id: string;
  status: SimulationSessionStatus;
  timedMode: boolean;
  currentDay: number;
  daysInMonth: number;
  nextDayAt: string | null;
  startingBudget: string;
  currentBalance: string;
  savingsBalance: string;
  score: string;
  pending: { type: 'NONE'; id: null };
  createdAt: string;
  completedAt: string | null;
  briefing: {
    allocationOptions: SimulationScenario['allocationOptions'];
    customAllocation: SimulationScenario['customAllocation'];
    obligations: Array<{
      id: string;
      templateCode: string;
      name: string;
      category: string;
      amountDue: string;
      dueDay: number;
      status: string;
    }>;
    surpriseEventCount: number;
  };
  replayed: boolean;
};

type SimulationSummary = {
  id: string;
  status: SimulationSessionStatus;
  timedMode: boolean;
  currentDay: number;
  daysInMonth: number;
  nextDayAt: string | null;
  startingBudget: string;
  currentBalance: string;
  savingsBalance: string;
  score: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

type ActiveSimulationResponse = {
  active: SimulationSummary | null;
  latestCompleted: SimulationSummary | null;
};

@Injectable()
export class SimulationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createBriefing(
    userId: string,
    dto: CreateSimulationDto,
    idempotencyKey: string | undefined,
  ): Promise<BriefingResponse> {
    this.validateIdempotencyKey(idempotencyKey);
    const payloadHash = this.payloadHash(dto);

    const priorAction = await this.findResumableCreationAction(
      userId,
      idempotencyKey,
    );
    if (priorAction) {
      return this.replay(priorAction, payloadHash);
    }

    const existingSession = await this.findResumableSession(userId);
    if (existingSession) {
      throw new ConflictException('ACTIVE_SESSION_EXISTS');
    }

    const [obligations, events] = await Promise.all([
      this.prisma.simulationObligationTemplate.findMany({
        where: { isActive: true },
      }),
      this.prisma.simulationEventTemplate.findMany({
        where: { isActive: true },
      }),
    ]);

    let scenario: SimulationScenario;
    try {
      scenario = buildSimulationScenario({ obligations, events });
    } catch (error) {
      throw new ServiceUnavailableException({
        message: 'SIMULATION_CATALOGUE_UNAVAILABLE',
        cause: error instanceof Error ? error.message : undefined,
      });
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const session = await tx.simulationSession.create({
          data: {
            userId,
            status: SimulationSessionStatus.BRIEFING,
            scenarioVersion: scenario.scenarioVersion,
            scenarioSnapshot: scenario,
            timedMode: dto.timedMode,
            startingBudget: scenario.startingBudget,
            // The fictional split is not selected until the setup endpoint.
            currentBalance: scenario.startingBudget,
            savingsBalance: '0.00',
            savingsRetentionMultiplier: '1.20',
            obligations: {
              create: scenario.obligations.map((obligation) => ({
                templateCode: obligation.templateCode,
                name: obligation.name,
                category: obligation.category,
                amountDue: obligation.amountDue,
                dueDay: obligation.dueDay,
                consequenceSnapshot: {
                  basePoints: obligation.basePoints,
                  savingsPointsFactor: obligation.savingsPointsFactor,
                },
              })),
            },
            events: {
              create: scenario.events.map((event) => ({
                templateCode: event.templateCode,
                triggerDay: event.triggerDay,
                eventSnapshot: event.eventSnapshot,
              })),
            },
          },
          include: {
            obligations: { orderBy: [{ dueDay: 'asc' }, { createdAt: 'asc' }] },
            events: true,
          },
        });

        const response = this.toBriefingResponse(session, scenario, false);
        await tx.simulationAction.create({
          data: {
            sessionId: session.id,
            actionType: SimulationActionType.CREATE_SIMULATION,
            idempotencyKey,
            payloadHash,
            responseSnapshot: response,
          },
        });
        return response;
      });
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      return this.reconcileConcurrentCreation(
        userId,
        idempotencyKey,
        payloadHash,
      );
    }
  }

  async getActiveSession(userId: string): Promise<ActiveSimulationResponse> {
    const [active, latestCompleted] = await Promise.all([
      this.prisma.simulationSession.findFirst({
        where: { userId, status: { in: resumableStatuses } },
        orderBy: { updatedAt: 'desc' },
        select: simulationSummarySelect,
      }),
      this.prisma.simulationSession.findFirst({
        where: { userId, status: SimulationSessionStatus.COMPLETED },
        orderBy: { completedAt: 'desc' },
        select: simulationSummarySelect,
      }),
    ]);

    return {
      active: active ? this.toSimulationSummary(active) : null,
      latestCompleted: latestCompleted
        ? this.toSimulationSummary(latestCompleted)
        : null,
    };
  }

  private validateIdempotencyKey(
    idempotencyKey: string | undefined,
  ): asserts idempotencyKey is string {
    if (!idempotencyKey || !isUUID(idempotencyKey)) {
      throw new BadRequestException('A valid Idempotency-Key UUID is required');
    }
  }

  private payloadHash(dto: CreateSimulationDto): string {
    return createHash('sha256')
      .update(JSON.stringify({ timedMode: dto.timedMode }))
      .digest('hex');
  }

  private async reconcileConcurrentCreation(
    userId: string,
    idempotencyKey: string,
    payloadHash: string,
  ): Promise<BriefingResponse> {
    const priorAction = await this.findResumableCreationAction(
      userId,
      idempotencyKey,
    );
    if (priorAction) {
      return this.replay(priorAction, payloadHash);
    }

    if (await this.findResumableSession(userId)) {
      throw new ConflictException('ACTIVE_SESSION_EXISTS');
    }

    throw new ConflictException('SIMULATION_CREATION_CONFLICT');
  }

  private async findResumableCreationAction(
    userId: string,
    idempotencyKey: string,
  ): Promise<StoredCreationAction | null> {
    return this.prisma.simulationAction.findFirst({
      where: {
        actionType: SimulationActionType.CREATE_SIMULATION,
        idempotencyKey,
        session: {
          userId,
          status: { in: resumableStatuses },
        },
      },
      orderBy: { committedAt: 'desc' },
      select: { payloadHash: true, responseSnapshot: true },
    });
  }

  private async findResumableSession(
    userId: string,
  ): Promise<{ id: string } | null> {
    return this.prisma.simulationSession.findFirst({
      where: { userId, status: { in: resumableStatuses } },
      select: { id: true },
    });
  }

  private replay(
    action: StoredCreationAction,
    payloadHash: string,
  ): BriefingResponse {
    if (action.payloadHash !== payloadHash) {
      throw new ConflictException('IDEMPOTENCY_KEY_REUSED');
    }
    if (!this.isBriefingResponse(action.responseSnapshot)) {
      throw new ServiceUnavailableException('SIMULATION_REPLAY_UNAVAILABLE');
    }
    return { ...action.responseSnapshot, replayed: true };
  }

  private toBriefingResponse(
    session: {
      id: string;
      status: SimulationSessionStatus;
      timedMode: boolean;
      currentDay: number;
      daysInMonth: number;
      nextDayAt: Date | null;
      startingBudget: unknown;
      currentBalance: unknown;
      savingsBalance: unknown;
      score: unknown;
      createdAt: Date;
      completedAt: Date | null;
      obligations: Array<{
        id: string;
        templateCode: string;
        name: string;
        category: string;
        amountDue: unknown;
        dueDay: number;
        status: string;
      }>;
      events: unknown[];
    },
    scenario: SimulationScenario,
    replayed: boolean,
  ): BriefingResponse {
    return {
      id: session.id,
      status: session.status,
      timedMode: session.timedMode,
      currentDay: session.currentDay,
      daysInMonth: session.daysInMonth,
      nextDayAt: session.nextDayAt?.toISOString() ?? null,
      startingBudget: this.money(session.startingBudget),
      currentBalance: this.money(session.currentBalance),
      savingsBalance: this.money(session.savingsBalance),
      score: this.money(session.score),
      pending: { type: 'NONE', id: null },
      createdAt: session.createdAt.toISOString(),
      completedAt: session.completedAt?.toISOString() ?? null,
      briefing: {
        allocationOptions: scenario.allocationOptions,
        customAllocation: scenario.customAllocation,
        obligations: session.obligations.map((obligation) => ({
          id: obligation.id,
          templateCode: obligation.templateCode,
          name: obligation.name,
          category: obligation.category,
          amountDue: this.money(obligation.amountDue),
          dueDay: obligation.dueDay,
          status: obligation.status,
        })),
        surpriseEventCount: session.events.length,
      },
      replayed,
    };
  }

  private toSimulationSummary(session: {
    id: string;
    status: SimulationSessionStatus;
    timedMode: boolean;
    currentDay: number;
    daysInMonth: number;
    nextDayAt: Date | null;
    startingBudget: unknown;
    currentBalance: unknown;
    savingsBalance: unknown;
    score: unknown;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
  }): SimulationSummary {
    return {
      id: session.id,
      status: session.status,
      timedMode: session.timedMode,
      currentDay: session.currentDay,
      daysInMonth: session.daysInMonth,
      nextDayAt: session.nextDayAt?.toISOString() ?? null,
      startingBudget: this.money(session.startingBudget),
      currentBalance: this.money(session.currentBalance),
      savingsBalance: this.money(session.savingsBalance),
      score: this.money(session.score),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      completedAt: session.completedAt?.toISOString() ?? null,
    };
  }

  private money(value: unknown): string {
    return Number(value).toFixed(2);
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }

  private isBriefingResponse(value: unknown): value is BriefingResponse {
    return (
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      'briefing' in value &&
      'replayed' in value
    );
  }
}
