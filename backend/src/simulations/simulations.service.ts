import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  Prisma,
  SimulationActionType,
  SimulationEventStatus,
  SimulationObligationStatus,
  SimulationPresentationHold,
  SimulationSessionStatus,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { isUUID } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSimulationDto } from './dto/create-simulation.dto';
import { SetupSimulationDto } from './dto/setup-simulation.dto';
import { SimulationTransitionService } from './simulation-transition.service';
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

type StoredAdvanceAction = StoredCreationAction & {
  actionType: SimulationActionType;
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

type SetupResponse = {
  session: SimulationSummary & { pending: { type: string; id: null } };
  allocation: AllocationOption;
  replayed: boolean;
};

type AdvanceResponse = SimulationDetailResponse & { replayed: boolean };

type AdvanceableSession = {
  id: string;
  status: SimulationSessionStatus;
  timedMode: boolean;
  presentationHold: SimulationPresentationHold;
  obligations: Array<{ id: string }>;
  events: Array<{ id: string }>;
};

const advanceableSessionSelect = {
  id: true,
  status: true,
  timedMode: true,
  presentationHold: true,
  obligations: {
    where: { status: SimulationObligationStatus.PAYABLE },
    select: { id: true },
  },
  events: {
    where: { status: SimulationEventStatus.REVEALED },
    select: { id: true },
  },
} satisfies Prisma.SimulationSessionSelect;

const TIMED_DAY_DURATION_MS = 15_000;

@Injectable()
export class SimulationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    private readonly transitionService?: SimulationTransitionService,
  ) {}

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
    let active = await this.prisma.simulationSession.findFirst({
      where: { userId, status: { in: resumableStatuses } },
      orderBy: { updatedAt: 'desc' },
      select: simulationSummarySelect,
    });
    if (
      active?.status === SimulationSessionStatus.ACTIVE &&
      this.transitionService
    ) {
      await this.transitionService.resolveDueTransitions(active.id);
      active = await this.prisma.simulationSession.findFirst({
        where: { userId, status: { in: resumableStatuses } },
        orderBy: { updatedAt: 'desc' },
        select: simulationSummarySelect,
      });
    }
    const latestCompleted = await this.prisma.simulationSession.findFirst({
      where: { userId, status: SimulationSessionStatus.COMPLETED },
      orderBy: { completedAt: 'desc' },
      select: simulationSummarySelect,
    });

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

    let session = await this.prisma.simulationSession.findFirst({
      where: { id: sessionId, userId },
      select: simulationDetailSelect,
    });
    if (!session) {
      throw new NotFoundException('SIMULATION_NOT_FOUND');
    }
    if (session.status === SimulationSessionStatus.EXPIRED) {
      throw new GoneException('SIMULATION_EXPIRED');
    }
    if (
      session.status === SimulationSessionStatus.ACTIVE &&
      this.transitionService
    ) {
      await this.transitionService.resolveDueTransitions(session.id);
      session = await this.prisma.simulationSession.findFirst({
        where: { id: sessionId, userId },
        select: simulationDetailSelect,
      });
      if (!session) {
        throw new NotFoundException('SIMULATION_NOT_FOUND');
      }
    }

    return this.toSimulationDetailResponse(session);
  }

  async advanceSession(
    userId: string,
    sessionId: string,
    idempotencyKey: string | undefined,
  ): Promise<AdvanceResponse> {
    if (!isUUID(sessionId)) {
      throw new BadRequestException('SIMULATION_ID_INVALID');
    }
    this.validateIdempotencyKey(idempotencyKey);
    const payloadHash = this.hashPayload({});

    const session = await this.prisma.simulationSession.findFirst({
      where: { id: sessionId, userId },
      select: advanceableSessionSelect,
    });
    if (!session) {
      throw new NotFoundException('SIMULATION_NOT_FOUND');
    }

    const priorAction = await this.findAdvanceAction(sessionId, idempotencyKey);
    if (priorAction) {
      return this.replayAdvance(priorAction, payloadHash);
    }
    this.assertManualAdvanceAllowed(session);
    if (!this.transitionService) {
      throw new ServiceUnavailableException('SIMULATION_ADVANCE_UNAVAILABLE');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const lockedSession = await tx.simulationSession.findUniqueOrThrow({
          where: { id: sessionId },
          select: advanceableSessionSelect,
        });
        this.assertManualAdvanceAllowed(lockedSession);
        await this.transitionService!.advanceOneDayInTransaction(tx, sessionId);

        const refreshedSession = await tx.simulationSession.findUniqueOrThrow({
          where: { id: sessionId },
          select: simulationDetailSelect,
        });
        const response: AdvanceResponse = {
          ...this.toSimulationDetailResponse(refreshedSession),
          replayed: false,
        };
        await tx.simulationAction.create({
          data: {
            sessionId,
            actionType: SimulationActionType.ADVANCE_DAY,
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
      const racedAction = await this.findAdvanceAction(
        sessionId,
        idempotencyKey,
      );
      if (racedAction) {
        return this.replayAdvance(racedAction, payloadHash);
      }
      throw new ConflictException('SIMULATION_ADVANCE_CONFLICT');
    }
  }

  private toSimulationDetailResponse(session: {
    status: SimulationSessionStatus;
    presentationHold: SimulationPresentationHold;
    scenarioSnapshot: unknown;
    events: Array<{
      id: string;
      triggerDay: number;
      eventSnapshot: unknown;
      decisionExpiresAt: Date | null;
    }>;
    obligations: Array<{
      id: string;
      templateCode: string;
      name: string;
      category: string;
      amountDue: unknown;
      dueDay: number;
      status: string;
      paidAt: Date | null;
      currentUsed: unknown;
      savingsUsed: unknown;
      pointsAwarded: unknown;
    }>;
    scoreEntries: Array<{
      id: string;
      sourceType: string;
      sourceId: string | null;
      simulatedDay: number;
      pointsDelta: unknown;
      reason: string;
      createdAt: Date;
    }>;
    id: string;
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
  }): SimulationDetailResponse {
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
      allowedActions: this.allowedActions(session),
    };
  }

  async setupSession(
    userId: string,
    sessionId: string,
    dto: SetupSimulationDto,
    idempotencyKey: string | undefined,
  ): Promise<SetupResponse> {
    if (!isUUID(sessionId)) {
      throw new BadRequestException('SIMULATION_ID_INVALID');
    }
    this.validateIdempotencyKey(idempotencyKey);
    this.validateSetupRequest(dto);
    const payloadHash = this.hashPayload({
      allocationId: dto.allocationId ?? null,
      currentAmount: dto.currentAmount ?? null,
    });

    const session = await this.prisma.simulationSession.findFirst({
      where: { id: sessionId, userId },
      select: {
        id: true,
        status: true,
        timedMode: true,
        startingBudget: true,
        scenarioSnapshot: true,
      },
    });
    if (!session) {
      throw new NotFoundException('SIMULATION_NOT_FOUND');
    }

    const priorAction = await this.findSetupAction(sessionId, idempotencyKey);
    if (priorAction) {
      return this.replaySetup(priorAction, payloadHash);
    }
    if (session.status !== SimulationSessionStatus.BRIEFING) {
      throw new ConflictException('SETUP_ALREADY_CONFIRMED');
    }

    const scenario = this.readScenarioSnapshot(session.scenarioSnapshot);
    if (!scenario) {
      throw new ServiceUnavailableException('SIMULATION_SETUP_UNAVAILABLE');
    }
    const allocation = this.resolveSetupAllocation(
      dto,
      scenario,
      this.money(session.startingBudget),
    );
    const scenarioSnapshot = this.withSelectedAllocation(
      session.scenarioSnapshot,
      allocation,
    );
    return this.prisma.$transaction(async (tx) => {
      const update = await tx.simulationSession.updateMany({
        where: {
          id: sessionId,
          userId,
          status: SimulationSessionStatus.BRIEFING,
        },
        data: {
          status: SimulationSessionStatus.ACTIVE,
          scenarioSnapshot,
          currentBalance: allocation.currentAmount,
          savingsBalance: allocation.savingsAmount,
          nextDayAt: session.timedMode
            ? new Date(Date.now() + TIMED_DAY_DURATION_MS)
            : null,
        },
      });

      if (update.count === 0) {
        const racedAction = await tx.simulationAction.findFirst({
          where: {
            sessionId,
            actionType: SimulationActionType.SETUP,
            idempotencyKey,
          },
          select: { payloadHash: true, responseSnapshot: true },
        });
        if (racedAction) {
          return this.replaySetup(racedAction, payloadHash);
        }
        throw new ConflictException('SETUP_ALREADY_CONFIRMED');
      }

      const updatedSession = await tx.simulationSession.findUniqueOrThrow({
        where: { id: sessionId },
        select: {
          ...simulationSummarySelect,
          presentationHold: true,
        },
      });
      const response: SetupResponse = {
        session: {
          ...this.toSimulationSummary(updatedSession),
          pending: { type: updatedSession.presentationHold, id: null },
        },
        allocation,
        replayed: false,
      };
      await tx.simulationAction.create({
        data: {
          sessionId,
          actionType: SimulationActionType.SETUP,
          idempotencyKey,
          payloadHash,
          responseSnapshot: response,
        },
      });
      return response;
    });
  }

  private validateIdempotencyKey(
    idempotencyKey: string | undefined,
  ): asserts idempotencyKey is string {
    if (!idempotencyKey || !isUUID(idempotencyKey)) {
      throw new BadRequestException('A valid Idempotency-Key UUID is required');
    }
  }

  private payloadHash(dto: CreateSimulationDto): string {
    return this.hashPayload({ timedMode: dto.timedMode });
  }

  private hashPayload(payload: object): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  private validateSetupRequest(dto: SetupSimulationDto): void {
    if (
      (dto.allocationId === undefined && dto.currentAmount === undefined) ||
      (dto.allocationId !== undefined && dto.currentAmount !== undefined)
    ) {
      throw new BadRequestException('EXACTLY_ONE_ALLOCATION_REQUIRED');
    }
  }

  private async findSetupAction(
    sessionId: string,
    idempotencyKey: string,
  ): Promise<StoredCreationAction | null> {
    return this.prisma.simulationAction.findFirst({
      where: {
        sessionId,
        actionType: SimulationActionType.SETUP,
        idempotencyKey,
      },
      select: { payloadHash: true, responseSnapshot: true },
    });
  }

  private replaySetup(
    action: StoredCreationAction,
    payloadHash: string,
  ): SetupResponse {
    if (action.payloadHash !== payloadHash) {
      throw new ConflictException('IDEMPOTENCY_KEY_REUSED');
    }
    if (!this.isSetupResponse(action.responseSnapshot)) {
      throw new ServiceUnavailableException('SIMULATION_REPLAY_UNAVAILABLE');
    }
    return { ...action.responseSnapshot, replayed: true };
  }

  private assertManualAdvanceAllowed(session: AdvanceableSession): void {
    if (session.timedMode) {
      throw new ConflictException('TIMED_MODE_ACTIVE');
    }
    if (session.status !== SimulationSessionStatus.ACTIVE) {
      throw new ConflictException('SIMULATION_NOT_ACTIVE');
    }
    if (
      session.presentationHold !== SimulationPresentationHold.NONE ||
      session.obligations.length > 0 ||
      session.events.length > 0
    ) {
      throw new ConflictException('SIMULATION_ACTION_PENDING');
    }
  }

  private async findAdvanceAction(
    sessionId: string,
    idempotencyKey: string,
  ): Promise<StoredAdvanceAction | null> {
    return this.prisma.simulationAction.findFirst({
      where: { sessionId, idempotencyKey },
      select: { actionType: true, payloadHash: true, responseSnapshot: true },
    });
  }

  private replayAdvance(
    action: StoredAdvanceAction,
    payloadHash: string,
  ): AdvanceResponse {
    if (
      action.actionType !== SimulationActionType.ADVANCE_DAY ||
      action.payloadHash !== payloadHash
    ) {
      throw new ConflictException('IDEMPOTENCY_KEY_REUSED');
    }
    if (!this.isAdvanceResponse(action.responseSnapshot)) {
      throw new ServiceUnavailableException('SIMULATION_REPLAY_UNAVAILABLE');
    }
    return { ...action.responseSnapshot, replayed: true };
  }

  private resolveSetupAllocation(
    dto: SetupSimulationDto,
    scenario: ReadableScenarioSnapshot,
    startingBudget: string,
  ): AllocationOption {
    if (dto.allocationId !== undefined) {
      const allocation = scenario.allocationOptions.find(
        (option) => option.id === dto.allocationId,
      );
      if (!allocation) {
        throw new BadRequestException('SIMULATION_ALLOCATION_INVALID');
      }
      return allocation;
    }

    const currentCents = this.moneyToCents(dto.currentAmount);
    const budgetCents = this.moneyToCents(startingBudget);
    const minimumCents = this.moneyToCents(
      scenario.customAllocation.minCurrentAmount,
    );
    const maximumCents = this.moneyToCents(
      scenario.customAllocation.maxCurrentAmount,
    );
    const incrementCents = this.moneyToCents(
      scenario.customAllocation.increment,
    );
    if (
      currentCents === null ||
      budgetCents === null ||
      minimumCents === null ||
      maximumCents === null ||
      incrementCents === null ||
      currentCents < minimumCents ||
      currentCents > maximumCents ||
      currentCents > budgetCents ||
      incrementCents <= 0 ||
      (currentCents - minimumCents) % incrementCents !== 0
    ) {
      throw new BadRequestException('SIMULATION_ALLOCATION_INVALID');
    }

    const currentAmount = this.centsToMoney(currentCents);
    const savingsAmount = this.centsToMoney(budgetCents - currentCents);
    return {
      id: `custom_current_${currentAmount.replace('.', '_')}`,
      label: `Custom: R${currentAmount} Current / R${savingsAmount} Savings`,
      currentAmount,
      savingsAmount,
    };
  }

  private withSelectedAllocation(
    snapshot: unknown,
    allocation: AllocationOption,
  ): Prisma.InputJsonValue {
    const record = this.record(snapshot);
    if (!record) {
      throw new ServiceUnavailableException('SIMULATION_SETUP_UNAVAILABLE');
    }
    return { ...record, selectedAllocation: allocation };
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

  private allowedActions(session: {
    status: SimulationSessionStatus;
    timedMode: boolean;
    presentationHold: SimulationPresentationHold;
    obligations: Array<{ status: string }>;
    events: unknown[];
  }): string[] {
    if (session.status === SimulationSessionStatus.BRIEFING) {
      return ['SETUP'];
    }
    if (
      session.status === SimulationSessionStatus.ACTIVE &&
      !session.timedMode &&
      session.presentationHold === SimulationPresentationHold.NONE &&
      !session.obligations.some(
        (obligation) =>
          obligation.status === SimulationObligationStatus.PAYABLE,
      ) &&
      session.events.length === 0
    ) {
      return ['ADVANCE_DAY'];
    }
    return [];
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

  private moneyToCents(value: unknown): number | null {
    if (typeof value !== 'string' || !/^\d+\.\d{2}$/.test(value)) {
      return null;
    }
    const [whole, cents] = value.split('.');
    const parsed = Number(whole) * 100 + Number(cents);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }

  private centsToMoney(cents: number): string {
    return (cents / 100).toFixed(2);
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

  private isSetupResponse(value: unknown): value is SetupResponse {
    return (
      typeof value === 'object' &&
      value !== null &&
      'session' in value &&
      'allocation' in value &&
      'replayed' in value
    );
  }

  private isAdvanceResponse(value: unknown): value is AdvanceResponse {
    return (
      typeof value === 'object' &&
      value !== null &&
      'session' in value &&
      'obligations' in value &&
      'replayed' in value
    );
  }
}
