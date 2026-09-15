import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
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

const simulationDetailSelect = {
  ...simulationSummarySelect,
  presentationHold: true,
  scenarioSnapshot: true,
  obligations: {
    orderBy: [{ dueDay: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      templateCode: true,
      name: true,
      category: true,
      amountDue: true,
      dueDay: true,
      status: true,
      paidAt: true,
      currentUsed: true,
      savingsUsed: true,
      pointsAwarded: true,
    },
  },
  events: {
    where: { status: 'REVEALED' },
    orderBy: { revealedAt: 'asc' },
    take: 1,
    select: {
      id: true,
      triggerDay: true,
      eventSnapshot: true,
      decisionExpiresAt: true,
    },
  },
  scoreEntries: {
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      sourceType: true,
      sourceId: true,
      simulatedDay: true,
      pointsDelta: true,
      reason: true,
      createdAt: true,
    },
  },
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

type AllocationOption = SimulationScenario['allocationOptions'][number];
type SafeEventOption = {
  id: string;
  label: string;
  immediateCost: string;
  feeOrDebt: string;
};

type SimulationDetailResponse = {
  session: SimulationSummary & {
    pending: { type: string; id: string | null };
  };
  allocation: {
    options: AllocationOption[];
    custom: SimulationScenario['customAllocation'] | null;
    selected: AllocationOption | null;
  };
  obligations: Array<{
    id: string;
    templateCode: string;
    name: string;
    category: string;
    amountDue: string;
    dueDay: number;
    status: string;
    paidAt: string | null;
    currentUsed: string;
    savingsUsed: string;
    pointsAwarded: string;
  }>;
  currentEvent: {
    id: string;
    triggerDay: number;
    title: string;
    context: string;
    options: SafeEventOption[];
    decisionExpiresAt: string | null;
  } | null;
  recentScoreEntries: Array<{
    id: string;
    sourceType: string;
    sourceId: string | null;
    simulatedDay: number;
    pointsDelta: string;
    reason: string;
    createdAt: string;
  }>;
  allowedActions: string[];
};

type ReadableScenarioSnapshot = {
  allocationOptions: AllocationOption[];
  customAllocation: SimulationScenario['customAllocation'];
  selectedAllocation: AllocationOption | null;
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

  async getSession(
    userId: string,
    sessionId: string,
  ): Promise<SimulationDetailResponse> {
    if (!isUUID(sessionId)) {
      throw new BadRequestException('SIMULATION_ID_INVALID');
    }

    // Roadmap item 7 will resolve timed transitions before this owner-scoped read.
    const session = await this.prisma.simulationSession.findFirst({
      where: { id: sessionId, userId },
      select: simulationDetailSelect,
    });
    if (!session) {
      throw new NotFoundException('SIMULATION_NOT_FOUND');
    }
    if (session.status === SimulationSessionStatus.EXPIRED) {
      throw new GoneException('SIMULATION_EXPIRED');
    }

    const scenario = this.readScenarioSnapshot(session.scenarioSnapshot);
    const currentEvent = session.events[0]
      ? this.toSafeRevealedEvent(session.events[0])
      : null;

    return {
      session: {
        ...this.toSimulationSummary(session),
        pending: {
          type: session.presentationHold,
          id: currentEvent?.id ?? null,
        },
      },
      allocation: {
        options: scenario?.allocationOptions ?? [],
        custom: scenario?.customAllocation ?? null,
        selected: scenario?.selectedAllocation ?? null,
      },
      obligations: session.obligations.map((obligation) => ({
        id: obligation.id,
        templateCode: obligation.templateCode,
        name: obligation.name,
        category: obligation.category,
        amountDue: this.money(obligation.amountDue),
        dueDay: obligation.dueDay,
        status: obligation.status,
        paidAt: obligation.paidAt?.toISOString() ?? null,
        currentUsed: this.money(obligation.currentUsed),
        savingsUsed: this.money(obligation.savingsUsed),
        pointsAwarded: this.money(obligation.pointsAwarded),
      })),
      currentEvent,
      recentScoreEntries: session.scoreEntries.map((entry) => ({
        id: entry.id,
        sourceType: entry.sourceType,
        sourceId: entry.sourceId,
        simulatedDay: entry.simulatedDay,
        pointsDelta: this.money(entry.pointsDelta),
        reason: entry.reason,
        createdAt: entry.createdAt.toISOString(),
      })),
      allowedActions: this.allowedActions(session.status),
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

  private readScenarioSnapshot(
    snapshot: unknown,
  ): ReadableScenarioSnapshot | null {
    const record = this.record(snapshot);
    if (!record || !Array.isArray(record.allocationOptions)) {
      return null;
    }

    const allocationOptions = record.allocationOptions
      .map((option) => this.toAllocationOption(option))
      .filter((option): option is AllocationOption => option !== null);
    const customAllocation = this.toCustomAllocation(record.customAllocation);
    if (
      allocationOptions.length !== record.allocationOptions.length ||
      !customAllocation
    ) {
      return null;
    }

    return {
      allocationOptions,
      customAllocation,
      selectedAllocation: this.toAllocationOption(record.selectedAllocation),
    };
  }

  private toSafeRevealedEvent(event: {
    id: string;
    triggerDay: number;
    eventSnapshot: unknown;
    decisionExpiresAt: Date | null;
  }): SimulationDetailResponse['currentEvent'] {
    const snapshot = this.record(event.eventSnapshot);
    if (!snapshot || !Array.isArray(snapshot.options)) {
      throw new ServiceUnavailableException(
        'SIMULATION_EVENT_CONTENT_UNAVAILABLE',
      );
    }
    const title = this.string(snapshot.title);
    const context = this.string(snapshot.context);
    const options = snapshot.options
      .map((option) => this.toSafeEventOption(option))
      .filter((option): option is SafeEventOption => option !== null);
    if (!title || !context || options.length !== snapshot.options.length) {
      throw new ServiceUnavailableException(
        'SIMULATION_EVENT_CONTENT_UNAVAILABLE',
      );
    }

    return {
      id: event.id,
      triggerDay: event.triggerDay,
      title,
      context,
      options,
      decisionExpiresAt: event.decisionExpiresAt?.toISOString() ?? null,
    };
  }

  private toAllocationOption(value: unknown): AllocationOption | null {
    const record = this.record(value);
    const id = this.string(record?.id);
    const label = this.string(record?.label);
    const currentAmount = this.string(record?.currentAmount);
    const savingsAmount = this.string(record?.savingsAmount);
    if (!id || !label || !currentAmount || !savingsAmount) {
      return null;
    }
    return { id, label, currentAmount, savingsAmount };
  }

  private toCustomAllocation(
    value: unknown,
  ): SimulationScenario['customAllocation'] | null {
    const record = this.record(value);
    const minCurrentAmount = this.string(record?.minCurrentAmount);
    const maxCurrentAmount = this.string(record?.maxCurrentAmount);
    const increment = this.string(record?.increment);
    if (
      !record ||
      record.enabled !== true ||
      !minCurrentAmount ||
      !maxCurrentAmount ||
      !increment
    ) {
      return null;
    }
    return { enabled: true, minCurrentAmount, maxCurrentAmount, increment };
  }

  private toSafeEventOption(value: unknown): SafeEventOption | null {
    const record = this.record(value);
    const id = this.string(record?.id);
    const label = this.string(record?.label);
    const immediateCost = this.string(record?.immediateCost);
    const feeOrDebt = this.string(record?.feeOrDebt);
    if (!id || !label || !immediateCost || !feeOrDebt) {
      return null;
    }
    return { id, label, immediateCost, feeOrDebt };
  }

  private allowedActions(status: SimulationSessionStatus): string[] {
    return status === SimulationSessionStatus.BRIEFING ? ['SETUP'] : [];
  }

  private record(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : null;
  }

  private string(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
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
