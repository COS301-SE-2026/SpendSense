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
  SimulationScoreSourceType,
  SimulationSessionStatus,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { isUUID } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSimulationDto } from './dto/create-simulation.dto';
import { SetupSimulationDto } from './dto/setup-simulation.dto';
import { ResolveSimulationEventDto } from './dto/resolve-simulation-event.dto';
import { UpdateSimulationStatusDto } from './dto/update-simulation-status.dto';
import { SimulationTransitionService } from './simulation-transition.service';
import {
  buildSimulationScenario,
  type SimulationScenario,
} from './simulation-scenario-builder';

const resumableStatuses: SimulationSessionStatus[] = [
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

type PaymentResponse = SimulationDetailResponse & {
  payment: {
    obligationId: string;
    currentUsed: string;
    savingsUsed: string;
    pointsAwarded: string;
  };
  replayed: boolean;
};

type StoredPaymentAction = StoredCreationAction & {
  actionType: SimulationActionType;
};

type StoredEventResolutionAction = StoredCreationAction & {
  actionType: SimulationActionType;
};

type StoredContinueAction = StoredCreationAction & {
  actionType: SimulationActionType;
};

type StoredStatusAction = StoredCreationAction & {
  actionType: SimulationActionType;
};

type EventResolutionOption = {
  id: string;
  label: string;
  immediateCost: string;
  feeOrDebt: string;
  scoreDelta: string;
  explanation: string;
  introducedObligation: {
    templateCode: string;
    name: string;
    category: string;
    amountDue: string;
    dueDay: number;
    basePoints: string;
    savingsPointsFactor: string;
  } | null;
};

type EventResolutionResponse = SimulationDetailResponse & {
  event: {
    id: string;
    optionId: string;
    label: string;
    explanation: string;
    immediateCost: string;
    feeOrDebt: string;
    currentUsed: string;
    savingsUsed: string;
    uncoveredAmount: string;
    pointsAwarded: string;
    introducedObligationId: string | null;
  };
  replayed: boolean;
};

type ContinueResponse = SimulationDetailResponse & { replayed: boolean };

type StatusResponse = SimulationDetailResponse & { replayed: boolean };

type DiscardResponse = {
  session: {
    id: string;
    status: 'ABANDONED';
    abandonedAt: string;
  };
  replayed: boolean;
};

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

const paymentSessionSelect = {
  id: true,
  status: true,
  currentDay: true,
  currentBalance: true,
  savingsBalance: true,
  presentationHold: true,
  obligations: {
    select: {
      id: true,
      name: true,
      amountDue: true,
      status: true,
      consequenceSnapshot: true,
    },
  },
} satisfies Prisma.SimulationSessionSelect;

const eventResolutionSessionSelect = {
  id: true,
  status: true,
  timedMode: true,
  currentDay: true,
  currentBalance: true,
  savingsBalance: true,
  presentationHold: true,
  events: {
    select: {
      id: true,
      status: true,
      eventSnapshot: true,
      decisionExpiresAt: true,
    },
  },
} satisfies Prisma.SimulationSessionSelect;

const continueSessionSelect = {
  id: true,
  status: true,
  timedMode: true,
  presentationHold: true,
} satisfies Prisma.SimulationSessionSelect;

const pauseSessionSelect = {
  id: true,
  status: true,
  timedMode: true,
  nextDayAt: true,
  presentationHold: true,
  events: {
    where: { status: SimulationEventStatus.REVEALED },
    select: { id: true, decisionExpiresAt: true },
  },
} satisfies Prisma.SimulationSessionSelect;

const resumeSessionSelect = {
  id: true,
  status: true,
  timedMode: true,
  pausedDecisionSeconds: true,
  presentationHold: true,
  events: {
    where: { status: SimulationEventStatus.REVEALED },
    select: { id: true },
  },
} satisfies Prisma.SimulationSessionSelect;

const discardSessionSelect = {
  id: true,
  status: true,
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

  async payObligation(
    userId: string,
    sessionId: string,
    obligationId: string,
    idempotencyKey: string | undefined,
  ): Promise<PaymentResponse> {
    if (!isUUID(sessionId)) {
      throw new BadRequestException('SIMULATION_ID_INVALID');
    }
    if (!isUUID(obligationId)) {
      throw new BadRequestException('SIMULATION_OBLIGATION_ID_INVALID');
    }
    this.validateIdempotencyKey(idempotencyKey);
    const payloadHash = this.hashPayload({ obligationId });

    const ownedSession = await this.prisma.simulationSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });
    if (!ownedSession) {
      throw new NotFoundException('SIMULATION_NOT_FOUND');
    }
    const priorAction = await this.findPaymentAction(sessionId, idempotencyKey);
    if (priorAction) {
      return this.replayPayment(priorAction, payloadHash);
    }
    if (!this.transitionService) {
      throw new ServiceUnavailableException('SIMULATION_PAYMENT_UNAVAILABLE');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.transitionService!.resolveDueTransitionsInTransaction(
          tx,
          sessionId,
        );
        const session = await tx.simulationSession.findUniqueOrThrow({
          where: { id: sessionId },
          select: paymentSessionSelect,
        });
        const obligation = session.obligations.find(
          (candidate) => candidate.id === obligationId,
        );
        this.assertPaymentAllowed(session, obligation);
        const payment = this.calculatePayment(session, obligation);
        if (payment.remainingAmount !== '0.00') {
          throw new ConflictException({
            message: 'INSUFFICIENT_SIMULATION_FUNDS',
            currentBalance: this.money(session.currentBalance),
            savingsBalance: this.money(session.savingsBalance),
            remainingAmount: payment.remainingAmount,
          });
        }

        const now = new Date();
        await tx.simulationObligation.update({
          where: { id: obligation.id },
          data: {
            status: SimulationObligationStatus.PAID,
            paidAt: now,
            currentUsed: payment.currentUsed,
            savingsUsed: payment.savingsUsed,
            pointsAwarded: payment.pointsAwarded,
          },
        });
        await tx.simulationScoreEntry.create({
          data: {
            sessionId,
            sourceType: SimulationScoreSourceType.OBLIGATION_PAYMENT,
            sourceId: obligation.id,
            simulatedDay: session.currentDay,
            pointsDelta: payment.pointsAwarded,
            reason:
              payment.savingsUsed === '0.00'
                ? `Paid on time: ${obligation.name}`
                : `Paid using Savings: ${obligation.name}`,
            calculationData: {
              amountDue: payment.amountDue,
              currentUsed: payment.currentUsed,
              savingsUsed: payment.savingsUsed,
              basePoints: payment.basePoints,
              savingsPointsFactor: payment.savingsPointsFactor,
            },
          },
        });
        await tx.simulationSession.update({
          where: { id: sessionId },
          data: {
            currentBalance: payment.currentBalance,
            savingsBalance: payment.savingsBalance,
            score: { increment: payment.pointsAwarded },
            nextDayAt: null,
            presentationHold: SimulationPresentationHold.PAYMENT_RESULT,
          },
        });

        const refreshedSession = await tx.simulationSession.findUniqueOrThrow({
          where: { id: sessionId },
          select: simulationDetailSelect,
        });
        const response: PaymentResponse = {
          ...this.toSimulationDetailResponse(refreshedSession),
          payment: {
            obligationId: obligation.id,
            currentUsed: payment.currentUsed,
            savingsUsed: payment.savingsUsed,
            pointsAwarded: payment.pointsAwarded,
          },
          replayed: false,
        };
        await tx.simulationAction.create({
          data: {
            sessionId,
            actionType: SimulationActionType.PAY_OBLIGATION,
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
      const racedAction = await this.findPaymentAction(
        sessionId,
        idempotencyKey,
      );
      if (racedAction) {
        return this.replayPayment(racedAction, payloadHash);
      }
      throw new ConflictException('SIMULATION_PAYMENT_CONFLICT');
    }
  }

  async resolveEvent(
    userId: string,
    sessionId: string,
    eventId: string,
    dto: ResolveSimulationEventDto,
    idempotencyKey: string | undefined,
  ): Promise<EventResolutionResponse> {
    if (!isUUID(sessionId)) {
      throw new BadRequestException('SIMULATION_ID_INVALID');
    }
    if (!isUUID(eventId)) {
      throw new BadRequestException('SIMULATION_EVENT_ID_INVALID');
    }
    this.validateIdempotencyKey(idempotencyKey);
    const payloadHash = this.hashPayload({ eventId, optionId: dto.optionId });

    const ownedSession = await this.prisma.simulationSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });
    if (!ownedSession) {
      throw new NotFoundException('SIMULATION_NOT_FOUND');
    }
    const priorAction = await this.findEventResolutionAction(
      sessionId,
      idempotencyKey,
    );
    if (priorAction) {
      return this.replayEventResolution(priorAction, payloadHash);
    }
    if (!this.transitionService) {
      throw new ServiceUnavailableException('SIMULATION_EVENT_UNAVAILABLE');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.transitionService!.resolveDueTransitionsInTransaction(
          tx,
          sessionId,
        );
        const session = await tx.simulationSession.findUniqueOrThrow({
          where: { id: sessionId },
          select: eventResolutionSessionSelect,
        });
        const event = session.events.find(
          (candidate) => candidate.id === eventId,
        );
        this.assertEventResolutionAllowed(session, event);
        const option = this.readEventResolutionOption(
          event.eventSnapshot,
          dto.optionId,
        );
        const effect = this.calculateEventEffect(session, option);
        const now = new Date();

        await tx.simulationEvent.update({
          where: { id: event.id },
          data: {
            status: SimulationEventStatus.RESOLVED,
            selectedOptionId: option.id,
            resolvedAt: now,
            resolutionSnapshot: {
              optionId: option.id,
              immediateCost: option.immediateCost,
              feeOrDebt: option.feeOrDebt,
              currentUsed: effect.currentUsed,
              savingsUsed: effect.savingsUsed,
              uncoveredAmount: effect.uncoveredAmount,
              scoreDelta: option.scoreDelta,
            },
          },
        });

        const introducedObligation = option.introducedObligation
          ? await tx.simulationObligation.create({
              data: {
                sessionId,
                introducedByEventId: event.id,
                templateCode: option.introducedObligation.templateCode,
                name: option.introducedObligation.name,
                category: option.introducedObligation.category,
                amountDue: option.introducedObligation.amountDue,
                dueDay: option.introducedObligation.dueDay,
                consequenceSnapshot: {
                  basePoints: option.introducedObligation.basePoints,
                  savingsPointsFactor:
                    option.introducedObligation.savingsPointsFactor,
                },
              },
              select: { id: true },
            })
          : null;

        await tx.simulationScoreEntry.create({
          data: {
            sessionId,
            sourceType: SimulationScoreSourceType.EVENT_DECISION,
            sourceId: event.id,
            simulatedDay: session.currentDay,
            pointsDelta: option.scoreDelta,
            reason: `Event decision: ${option.label}`,
            calculationData: {
              optionId: option.id,
              immediateCost: option.immediateCost,
              feeOrDebt: option.feeOrDebt,
              currentUsed: effect.currentUsed,
              savingsUsed: effect.savingsUsed,
              uncoveredAmount: effect.uncoveredAmount,
            },
          },
        });
        await tx.simulationSession.update({
          where: { id: sessionId },
          data: {
            currentBalance: effect.currentBalance,
            savingsBalance: effect.savingsBalance,
            score: { increment: option.scoreDelta },
            nextDayAt: null,
            presentationHold: SimulationPresentationHold.EVENT_RESULT,
          },
        });

        const refreshedSession = await tx.simulationSession.findUniqueOrThrow({
          where: { id: sessionId },
          select: simulationDetailSelect,
        });
        const response: EventResolutionResponse = {
          ...this.toSimulationDetailResponse(refreshedSession),
          event: {
            id: event.id,
            optionId: option.id,
            label: option.label,
            explanation: option.explanation,
            immediateCost: option.immediateCost,
            feeOrDebt: option.feeOrDebt,
            currentUsed: effect.currentUsed,
            savingsUsed: effect.savingsUsed,
            uncoveredAmount: effect.uncoveredAmount,
            pointsAwarded: option.scoreDelta,
            introducedObligationId: introducedObligation?.id ?? null,
          },
          replayed: false,
        };
        await tx.simulationAction.create({
          data: {
            sessionId,
            actionType: SimulationActionType.RESOLVE_EVENT,
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
      const racedAction = await this.findEventResolutionAction(
        sessionId,
        idempotencyKey,
      );
      if (racedAction) {
        return this.replayEventResolution(racedAction, payloadHash);
      }
      throw new ConflictException('SIMULATION_EVENT_RESOLUTION_CONFLICT');
    }
  }

  async continueSession(
    userId: string,
    sessionId: string,
    idempotencyKey: string | undefined,
  ): Promise<ContinueResponse> {
    if (!isUUID(sessionId)) {
      throw new BadRequestException('SIMULATION_ID_INVALID');
    }
    this.validateIdempotencyKey(idempotencyKey);
    const payloadHash = this.hashPayload({});

    const ownedSession = await this.prisma.simulationSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });
    if (!ownedSession) {
      throw new NotFoundException('SIMULATION_NOT_FOUND');
    }
    const priorAction = await this.findContinueAction(
      sessionId,
      idempotencyKey,
    );
    if (priorAction) {
      return this.replayContinue(priorAction, payloadHash);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const session = await tx.simulationSession.findUniqueOrThrow({
          where: { id: sessionId },
          select: continueSessionSelect,
        });
        this.assertContinueAllowed(session);

        const update = await tx.simulationSession.updateMany({
          where: {
            id: sessionId,
            status: SimulationSessionStatus.ACTIVE,
            presentationHold: {
              in: [
                SimulationPresentationHold.PAYMENT_RESULT,
                SimulationPresentationHold.EVENT_RESULT,
              ],
            },
          },
          data: {
            presentationHold: SimulationPresentationHold.NONE,
            nextDayAt: session.timedMode
              ? new Date(Date.now() + TIMED_DAY_DURATION_MS)
              : null,
          },
        });
        if (update.count === 0) {
          const racedAction = await tx.simulationAction.findFirst({
            where: {
              sessionId,
              actionType: SimulationActionType.CONTINUE,
              idempotencyKey,
            },
            select: {
              actionType: true,
              payloadHash: true,
              responseSnapshot: true,
            },
          });
          if (racedAction) {
            return this.replayContinue(racedAction, payloadHash);
          }
          throw new ConflictException('SIMULATION_CONTINUE_NOT_ALLOWED');
        }

        const refreshedSession = await tx.simulationSession.findUniqueOrThrow({
          where: { id: sessionId },
          select: simulationDetailSelect,
        });
        const response: ContinueResponse = {
          ...this.toSimulationDetailResponse(refreshedSession),
          replayed: false,
        };
        await tx.simulationAction.create({
          data: {
            sessionId,
            actionType: SimulationActionType.CONTINUE,
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
      const racedAction = await this.findContinueAction(
        sessionId,
        idempotencyKey,
      );
      if (racedAction) {
        return this.replayContinue(racedAction, payloadHash);
      }
      throw new ConflictException('SIMULATION_CONTINUE_CONFLICT');
    }
  }

  async pauseSession(
    userId: string,
    sessionId: string,
    dto: UpdateSimulationStatusDto,
    idempotencyKey: string | undefined,
  ): Promise<StatusResponse> {
    if (!isUUID(sessionId)) {
      throw new BadRequestException('SIMULATION_ID_INVALID');
    }
    this.validateIdempotencyKey(idempotencyKey);
    if (dto.action !== 'pause') {
      throw new BadRequestException('SIMULATION_STATUS_ACTION_INVALID');
    }
    const payloadHash = this.hashPayload({ action: dto.action });

    const ownedSession = await this.prisma.simulationSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });
    if (!ownedSession) {
      throw new NotFoundException('SIMULATION_NOT_FOUND');
    }
    const priorAction = await this.findStatusAction(sessionId, idempotencyKey);
    if (priorAction) {
      return this.replayStatus(priorAction, payloadHash);
    }
    if (!this.transitionService) {
      throw new ServiceUnavailableException('SIMULATION_PAUSE_UNAVAILABLE');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.transitionService!.resolveDueTransitionsInTransaction(
          tx,
          sessionId,
        );
        const session = await tx.simulationSession.findUniqueOrThrow({
          where: { id: sessionId },
          select: pauseSessionSelect,
        });
        this.assertPauseAllowed(session);
        const now = new Date();
        const deadline =
          session.presentationHold === SimulationPresentationHold.EVENT_REVEAL
            ? session.events[0]?.decisionExpiresAt
            : session.nextDayAt;
        const pausedDecisionSeconds = this.remainingWholeSeconds(
          session.timedMode,
          deadline,
          now,
        );
        const update = await tx.simulationSession.updateMany({
          where: {
            id: sessionId,
            status: SimulationSessionStatus.ACTIVE,
            presentationHold: {
              in: [
                SimulationPresentationHold.NONE,
                SimulationPresentationHold.EVENT_REVEAL,
              ],
            },
          },
          data: {
            status: SimulationSessionStatus.PAUSED,
            pausedAt: now,
            pausedDecisionSeconds,
            nextDayAt: null,
          },
        });
        if (update.count === 0) {
          const racedAction = await tx.simulationAction.findFirst({
            where: {
              sessionId,
              actionType: SimulationActionType.CHANGE_STATUS,
              idempotencyKey,
            },
            select: {
              actionType: true,
              payloadHash: true,
              responseSnapshot: true,
            },
          });
          if (racedAction) {
            return this.replayStatus(racedAction, payloadHash);
          }
          throw new ConflictException('SIMULATION_PAUSE_NOT_ALLOWED');
        }
        if (
          session.presentationHold === SimulationPresentationHold.EVENT_REVEAL
        ) {
          await tx.simulationEvent.update({
            where: { id: session.events[0].id },
            data: { decisionExpiresAt: null },
          });
        }

        const refreshedSession = await tx.simulationSession.findUniqueOrThrow({
          where: { id: sessionId },
          select: simulationDetailSelect,
        });
        const response: StatusResponse = {
          ...this.toSimulationDetailResponse(refreshedSession),
          replayed: false,
        };
        await tx.simulationAction.create({
          data: {
            sessionId,
            actionType: SimulationActionType.CHANGE_STATUS,
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
      const racedAction = await this.findStatusAction(
        sessionId,
        idempotencyKey,
      );
      if (racedAction) {
        return this.replayStatus(racedAction, payloadHash);
      }
      throw new ConflictException('SIMULATION_PAUSE_CONFLICT');
    }
  }

  async resumeSession(
    userId: string,
    sessionId: string,
    dto: UpdateSimulationStatusDto,
    idempotencyKey: string | undefined,
  ): Promise<StatusResponse> {
    if (!isUUID(sessionId)) {
      throw new BadRequestException('SIMULATION_ID_INVALID');
    }
    this.validateIdempotencyKey(idempotencyKey);
    if (dto.action !== 'resume') {
      throw new BadRequestException('SIMULATION_STATUS_ACTION_INVALID');
    }
    const payloadHash = this.hashPayload({ action: dto.action });

    const ownedSession = await this.prisma.simulationSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });
    if (!ownedSession) {
      throw new NotFoundException('SIMULATION_NOT_FOUND');
    }
    const priorAction = await this.findStatusAction(sessionId, idempotencyKey);
    if (priorAction) {
      return this.replayStatus(priorAction, payloadHash);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const session = await tx.simulationSession.findUniqueOrThrow({
          where: { id: sessionId },
          select: resumeSessionSelect,
        });
        this.assertResumeAllowed(session);

        const now = new Date();
        const restoredDeadline = this.restoredDeadline(
          session.timedMode,
          session.pausedDecisionSeconds,
          now,
        );
        const resumingEvent =
          session.presentationHold === SimulationPresentationHold.EVENT_REVEAL;
        const update = await tx.simulationSession.updateMany({
          where: {
            id: sessionId,
            status: SimulationSessionStatus.PAUSED,
            presentationHold: {
              in: [
                SimulationPresentationHold.NONE,
                SimulationPresentationHold.EVENT_REVEAL,
              ],
            },
          },
          data: {
            status: SimulationSessionStatus.ACTIVE,
            pausedAt: null,
            pausedDecisionSeconds: null,
            nextDayAt: resumingEvent ? null : restoredDeadline,
          },
        });
        if (update.count === 0) {
          const racedAction = await tx.simulationAction.findFirst({
            where: {
              sessionId,
              actionType: SimulationActionType.CHANGE_STATUS,
              idempotencyKey,
            },
            select: {
              actionType: true,
              payloadHash: true,
              responseSnapshot: true,
            },
          });
          if (racedAction) {
            return this.replayStatus(racedAction, payloadHash);
          }
          throw new ConflictException('SIMULATION_RESUME_NOT_ALLOWED');
        }
        if (resumingEvent && restoredDeadline) {
          await tx.simulationEvent.update({
            where: { id: session.events[0].id },
            data: { decisionExpiresAt: restoredDeadline },
          });
        }

        const refreshedSession = await tx.simulationSession.findUniqueOrThrow({
          where: { id: sessionId },
          select: simulationDetailSelect,
        });
        const response: StatusResponse = {
          ...this.toSimulationDetailResponse(refreshedSession),
          replayed: false,
        };
        await tx.simulationAction.create({
          data: {
            sessionId,
            actionType: SimulationActionType.CHANGE_STATUS,
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
      const racedAction = await this.findStatusAction(
        sessionId,
        idempotencyKey,
      );
      if (racedAction) {
        return this.replayStatus(racedAction, payloadHash);
      }
      throw new ConflictException('SIMULATION_RESUME_CONFLICT');
    }
  }

  async discardSession(
    userId: string,
    sessionId: string,
    dto: UpdateSimulationStatusDto,
    idempotencyKey: string | undefined,
  ): Promise<DiscardResponse> {
    if (!isUUID(sessionId)) {
      throw new BadRequestException('SIMULATION_ID_INVALID');
    }
    this.validateIdempotencyKey(idempotencyKey);
    if (dto.action !== 'discard') {
      throw new BadRequestException('SIMULATION_STATUS_ACTION_INVALID');
    }
    const payloadHash = this.hashPayload({ action: dto.action });

    const ownedSession = await this.prisma.simulationSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });
    if (!ownedSession) {
      throw new NotFoundException('SIMULATION_NOT_FOUND');
    }
    const priorAction = await this.findStatusAction(sessionId, idempotencyKey);
    if (priorAction) {
      return this.replayDiscard(priorAction, payloadHash);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const session = await tx.simulationSession.findUniqueOrThrow({
          where: { id: sessionId },
          select: discardSessionSelect,
        });
        if (!resumableStatuses.includes(session.status)) {
          throw new ConflictException('SIMULATION_DISCARD_NOT_ALLOWED');
        }

        const abandonedAt = new Date();
        const update = await tx.simulationSession.updateMany({
          where: {
            id: sessionId,
            userId,
            status: { in: resumableStatuses },
          },
          data: {
            status: SimulationSessionStatus.ABANDONED,
            abandonedAt,
            nextDayAt: null,
            pausedAt: null,
            pausedDecisionSeconds: null,
          },
        });
        if (update.count === 0) {
          const racedAction = await tx.simulationAction.findFirst({
            where: {
              sessionId,
              actionType: SimulationActionType.DISCARD,
              idempotencyKey,
            },
            select: {
              actionType: true,
              payloadHash: true,
              responseSnapshot: true,
            },
          });
          if (racedAction) {
            return this.replayDiscard(racedAction, payloadHash);
          }
          throw new ConflictException('SIMULATION_DISCARD_NOT_ALLOWED');
        }

        const response: DiscardResponse = {
          session: {
            id: session.id,
            status: 'ABANDONED',
            abandonedAt: abandonedAt.toISOString(),
          },
          replayed: false,
        };
        await tx.simulationAction.create({
          data: {
            sessionId,
            actionType: SimulationActionType.DISCARD,
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
      const racedAction = await this.findStatusAction(
        sessionId,
        idempotencyKey,
      );
      if (racedAction) {
        return this.replayDiscard(racedAction, payloadHash);
      }
      throw new ConflictException('SIMULATION_DISCARD_CONFLICT');
    }
  }

  private assertPauseAllowed(session: {
    status: SimulationSessionStatus;
    presentationHold: SimulationPresentationHold;
    events: Array<{ id: string; decisionExpiresAt: Date | null }>;
  }): void {
    if (session.status !== SimulationSessionStatus.ACTIVE) {
      throw new ConflictException('SIMULATION_NOT_ACTIVE');
    }
    if (
      session.presentationHold !== SimulationPresentationHold.NONE &&
      session.presentationHold !== SimulationPresentationHold.EVENT_REVEAL
    ) {
      throw new ConflictException('SIMULATION_PAUSE_NOT_ALLOWED');
    }
    if (
      session.presentationHold === SimulationPresentationHold.EVENT_REVEAL &&
      session.events.length !== 1
    ) {
      throw new ConflictException('SIMULATION_PAUSE_NOT_ALLOWED');
    }
  }

  private assertResumeAllowed(session: {
    status: SimulationSessionStatus;
    timedMode: boolean;
    pausedDecisionSeconds: number | null;
    presentationHold: SimulationPresentationHold;
    events: Array<{ id: string }>;
  }): void {
    if (session.status !== SimulationSessionStatus.PAUSED) {
      throw new ConflictException('SIMULATION_NOT_PAUSED');
    }
    if (
      session.presentationHold !== SimulationPresentationHold.NONE &&
      session.presentationHold !== SimulationPresentationHold.EVENT_REVEAL
    ) {
      throw new ConflictException('SIMULATION_RESUME_NOT_ALLOWED');
    }
    if (
      session.presentationHold === SimulationPresentationHold.EVENT_REVEAL &&
      session.events.length !== 1
    ) {
      throw new ConflictException('SIMULATION_RESUME_NOT_ALLOWED');
    }
    if (
      session.timedMode &&
      (session.pausedDecisionSeconds === null ||
        !Number.isInteger(session.pausedDecisionSeconds) ||
        session.pausedDecisionSeconds < 0)
    ) {
      throw new ConflictException('SIMULATION_RESUME_NOT_ALLOWED');
    }
    if (!session.timedMode && session.pausedDecisionSeconds !== null) {
      throw new ConflictException('SIMULATION_RESUME_NOT_ALLOWED');
    }
  }

  private remainingWholeSeconds(
    timedMode: boolean,
    deadline: Date | null | undefined,
    now: Date,
  ): number | null {
    if (!timedMode || !deadline) {
      return null;
    }
    return Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000));
  }

  private restoredDeadline(
    timedMode: boolean,
    pausedDecisionSeconds: number | null,
    now: Date,
  ): Date | null {
    if (!timedMode) {
      return null;
    }
    return new Date(now.getTime() + pausedDecisionSeconds! * 1000);
  }

  private assertContinueAllowed(session: {
    status: SimulationSessionStatus;
    presentationHold: SimulationPresentationHold;
  }): void {
    if (session.status !== SimulationSessionStatus.ACTIVE) {
      throw new ConflictException('SIMULATION_NOT_ACTIVE');
    }
    if (
      session.presentationHold !== SimulationPresentationHold.PAYMENT_RESULT &&
      session.presentationHold !== SimulationPresentationHold.EVENT_RESULT
    ) {
      throw new ConflictException('SIMULATION_CONTINUE_NOT_ALLOWED');
    }
  }

  private assertEventResolutionAllowed(
    session: {
      status: SimulationSessionStatus;
      presentationHold: SimulationPresentationHold;
    },
    event:
      | {
          id: string;
          status: SimulationEventStatus;
          eventSnapshot: unknown;
          decisionExpiresAt: Date | null;
        }
      | undefined,
  ): asserts event is {
    id: string;
    status: SimulationEventStatus;
    eventSnapshot: unknown;
    decisionExpiresAt: Date | null;
  } {
    if (event?.status === SimulationEventStatus.EXPIRED) {
      throw new ConflictException('EVENT_DECISION_EXPIRED');
    }
    if (session.status !== SimulationSessionStatus.ACTIVE) {
      throw new ConflictException('SIMULATION_NOT_ACTIVE');
    }
    if (!event || event.status !== SimulationEventStatus.REVEALED) {
      throw new ConflictException('SIMULATION_EVENT_NOT_REVEALED');
    }
    if (session.presentationHold !== SimulationPresentationHold.EVENT_REVEAL) {
      throw new ConflictException('SIMULATION_ACTION_PENDING');
    }
  }

  private readEventResolutionOption(
    eventSnapshot: unknown,
    optionId: string,
  ): EventResolutionOption {
    const snapshot = this.record(eventSnapshot);
    if (!snapshot || !Array.isArray(snapshot.options)) {
      throw new ServiceUnavailableException(
        'SIMULATION_EVENT_CONTENT_UNAVAILABLE',
      );
    }
    const options: unknown[] = snapshot.options;
    const candidate = options.find(
      (item: unknown) => this.record(item)?.id === optionId,
    );
    if (!candidate) {
      throw new BadRequestException('SIMULATION_EVENT_OPTION_INVALID');
    }
    const option = this.record(candidate);
    const id = this.string(option?.id);
    const label = this.string(option?.label);
    const immediateCost = this.normalizedMoney(option?.immediateCost);
    const feeOrDebt = this.normalizedMoney(option?.feeOrDebt);
    const scoreDelta = this.normalizedSignedMoney(option?.scoreDelta);
    const explanation = this.string(option?.explanation);
    if (
      !id ||
      !label ||
      !immediateCost ||
      !feeOrDebt ||
      !scoreDelta ||
      !explanation
    ) {
      throw new ServiceUnavailableException(
        'SIMULATION_EVENT_CONTENT_UNAVAILABLE',
      );
    }

    const introduced = this.record(option?.introducedObligation);
    const templateCode = this.string(introduced?.templateCode);
    const name = this.string(introduced?.name);
    const category = this.string(introduced?.category);
    const amountDue = this.normalizedMoney(introduced?.amountDue);
    const dueDay = introduced?.dueDay;
    const basePoints = this.normalizedMoney(introduced?.basePoints);
    const savingsPointsFactor = this.normalizedMoney(
      introduced?.savingsPointsFactor,
    );
    const hasIntroducedObligation = introduced !== null;
    if (
      hasIntroducedObligation &&
      (!templateCode ||
        !name ||
        !category ||
        !amountDue ||
        typeof dueDay !== 'number' ||
        !Number.isInteger(dueDay) ||
        !basePoints ||
        !savingsPointsFactor)
    ) {
      throw new ServiceUnavailableException(
        'SIMULATION_EVENT_CONTENT_UNAVAILABLE',
      );
    }

    return {
      id,
      label,
      immediateCost,
      feeOrDebt,
      scoreDelta,
      explanation,
      introducedObligation: hasIntroducedObligation
        ? {
            templateCode: templateCode!,
            name: name!,
            category: category!,
            amountDue: amountDue!,
            dueDay: dueDay as number,
            basePoints: basePoints!,
            savingsPointsFactor: savingsPointsFactor!,
          }
        : null,
    };
  }

  private calculateEventEffect(
    session: { currentBalance: unknown; savingsBalance: unknown },
    option: EventResolutionOption,
  ): {
    currentBalance: string;
    savingsBalance: string;
    currentUsed: string;
    savingsUsed: string;
    uncoveredAmount: string;
  } {
    const currentBalance = this.normalizedMoney(session.currentBalance);
    const savingsBalance = this.normalizedMoney(session.savingsBalance);
    const currentCents = this.moneyToCents(currentBalance);
    const savingsCents = this.moneyToCents(savingsBalance);
    const immediateCostCents = this.moneyToCents(option.immediateCost);
    const feeOrDebtCents = this.moneyToCents(option.feeOrDebt);
    if (
      currentCents === null ||
      savingsCents === null ||
      immediateCostCents === null ||
      feeOrDebtCents === null
    ) {
      throw new ServiceUnavailableException('SIMULATION_EVENT_UNAVAILABLE');
    }
    const totalCost = immediateCostCents + feeOrDebtCents;
    const currentUsed = Math.min(currentCents, totalCost);
    const savingsUsed = Math.min(savingsCents, totalCost - currentUsed);
    return {
      currentBalance: this.centsToMoney(currentCents - currentUsed),
      savingsBalance: this.centsToMoney(savingsCents - savingsUsed),
      currentUsed: this.centsToMoney(currentUsed),
      savingsUsed: this.centsToMoney(savingsUsed),
      uncoveredAmount: this.centsToMoney(totalCost - currentUsed - savingsUsed),
    };
  }

  private assertPaymentAllowed(
    session: {
      status: SimulationSessionStatus;
      presentationHold: SimulationPresentationHold;
    },
    obligation:
      | {
          id: string;
          name: string;
          amountDue: unknown;
          status: SimulationObligationStatus;
          consequenceSnapshot: unknown;
        }
      | undefined,
  ): asserts obligation is {
    id: string;
    name: string;
    amountDue: unknown;
    status: SimulationObligationStatus;
    consequenceSnapshot: unknown;
  } {
    if (session.status !== SimulationSessionStatus.ACTIVE) {
      throw new ConflictException('SIMULATION_NOT_ACTIVE');
    }
    if (session.presentationHold !== SimulationPresentationHold.NONE) {
      throw new ConflictException('SIMULATION_ACTION_PENDING');
    }
    if (
      !obligation ||
      obligation.status !== SimulationObligationStatus.PAYABLE
    ) {
      throw new ConflictException('SIMULATION_OBLIGATION_NOT_PAYABLE');
    }
  }

  private calculatePayment(
    session: { currentBalance: unknown; savingsBalance: unknown },
    obligation: {
      amountDue: unknown;
      consequenceSnapshot: unknown;
    },
  ): {
    amountDue: string;
    currentUsed: string;
    savingsUsed: string;
    currentBalance: string;
    savingsBalance: string;
    remainingAmount: string;
    pointsAwarded: string;
    basePoints: string;
    savingsPointsFactor: string;
  } {
    const amountDue = this.money(obligation.amountDue);
    const currentBalance = this.money(session.currentBalance);
    const savingsBalance = this.money(session.savingsBalance);
    const amountDueCents = this.moneyToCents(amountDue);
    const currentBalanceCents = this.moneyToCents(currentBalance);
    const savingsBalanceCents = this.moneyToCents(savingsBalance);
    const consequence = this.record(obligation.consequenceSnapshot);
    const basePoints = this.string(consequence?.basePoints);
    const savingsPointsFactor = this.string(consequence?.savingsPointsFactor);
    const basePointsCents = this.moneyToCents(basePoints);
    const savingsFactorCents = this.moneyToCents(savingsPointsFactor);
    if (
      amountDueCents === null ||
      amountDueCents <= 0 ||
      currentBalanceCents === null ||
      currentBalanceCents < 0 ||
      savingsBalanceCents === null ||
      savingsBalanceCents < 0 ||
      !basePoints ||
      basePointsCents === null ||
      basePointsCents < 0 ||
      !savingsPointsFactor ||
      savingsFactorCents === null ||
      savingsFactorCents < 0 ||
      savingsFactorCents > 100
    ) {
      throw new ServiceUnavailableException('SIMULATION_PAYMENT_UNAVAILABLE');
    }

    const currentUsedCents = Math.min(currentBalanceCents, amountDueCents);
    const savingsUsedCents = Math.min(
      savingsBalanceCents,
      amountDueCents - currentUsedCents,
    );
    const remainingCents = amountDueCents - currentUsedCents - savingsUsedCents;
    const pointsMultiplierCents =
      savingsUsedCents > 0 ? savingsFactorCents : 100;
    const pointsAwardedCents = Math.round(
      (basePointsCents * pointsMultiplierCents) / 100,
    );

    return {
      amountDue,
      currentUsed: this.centsToMoney(currentUsedCents),
      savingsUsed: this.centsToMoney(savingsUsedCents),
      currentBalance: this.centsToMoney(currentBalanceCents - currentUsedCents),
      savingsBalance: this.centsToMoney(savingsBalanceCents - savingsUsedCents),
      remainingAmount: this.centsToMoney(remainingCents),
      pointsAwarded: this.centsToMoney(pointsAwardedCents),
      basePoints,
      savingsPointsFactor,
    };
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

  private async findPaymentAction(
    sessionId: string,
    idempotencyKey: string,
  ): Promise<StoredPaymentAction | null> {
    return this.prisma.simulationAction.findFirst({
      where: { sessionId, idempotencyKey },
      select: { actionType: true, payloadHash: true, responseSnapshot: true },
    });
  }

  private replayPayment(
    action: StoredPaymentAction,
    payloadHash: string,
  ): PaymentResponse {
    if (
      action.actionType !== SimulationActionType.PAY_OBLIGATION ||
      action.payloadHash !== payloadHash
    ) {
      throw new ConflictException('IDEMPOTENCY_KEY_REUSED');
    }
    if (!this.isPaymentResponse(action.responseSnapshot)) {
      throw new ServiceUnavailableException('SIMULATION_REPLAY_UNAVAILABLE');
    }
    return { ...action.responseSnapshot, replayed: true };
  }

  private async findEventResolutionAction(
    sessionId: string,
    idempotencyKey: string,
  ): Promise<StoredEventResolutionAction | null> {
    return this.prisma.simulationAction.findFirst({
      where: { sessionId, idempotencyKey },
      select: { actionType: true, payloadHash: true, responseSnapshot: true },
    });
  }

  private replayEventResolution(
    action: StoredEventResolutionAction,
    payloadHash: string,
  ): EventResolutionResponse {
    if (
      action.actionType !== SimulationActionType.RESOLVE_EVENT ||
      action.payloadHash !== payloadHash
    ) {
      throw new ConflictException('IDEMPOTENCY_KEY_REUSED');
    }
    if (!this.isEventResolutionResponse(action.responseSnapshot)) {
      throw new ServiceUnavailableException('SIMULATION_REPLAY_UNAVAILABLE');
    }
    return { ...action.responseSnapshot, replayed: true };
  }

  private async findContinueAction(
    sessionId: string,
    idempotencyKey: string,
  ): Promise<StoredContinueAction | null> {
    return this.prisma.simulationAction.findFirst({
      where: { sessionId, idempotencyKey },
      select: { actionType: true, payloadHash: true, responseSnapshot: true },
    });
  }

  private replayContinue(
    action: StoredContinueAction,
    payloadHash: string,
  ): ContinueResponse {
    if (
      action.actionType !== SimulationActionType.CONTINUE ||
      action.payloadHash !== payloadHash
    ) {
      throw new ConflictException('IDEMPOTENCY_KEY_REUSED');
    }
    if (!this.isContinueResponse(action.responseSnapshot)) {
      throw new ServiceUnavailableException('SIMULATION_REPLAY_UNAVAILABLE');
    }
    return { ...action.responseSnapshot, replayed: true };
  }

  private async findStatusAction(
    sessionId: string,
    idempotencyKey: string,
  ): Promise<StoredStatusAction | null> {
    return this.prisma.simulationAction.findFirst({
      where: { sessionId, idempotencyKey },
      select: { actionType: true, payloadHash: true, responseSnapshot: true },
    });
  }

  private replayStatus(
    action: StoredStatusAction,
    payloadHash: string,
  ): StatusResponse {
    if (
      action.actionType !== SimulationActionType.CHANGE_STATUS ||
      action.payloadHash !== payloadHash
    ) {
      throw new ConflictException('IDEMPOTENCY_KEY_REUSED');
    }
    if (!this.isStatusResponse(action.responseSnapshot)) {
      throw new ServiceUnavailableException('SIMULATION_REPLAY_UNAVAILABLE');
    }
    return { ...action.responseSnapshot, replayed: true };
  }

  private replayDiscard(
    action: StoredStatusAction,
    payloadHash: string,
  ): DiscardResponse {
    if (
      action.actionType !== SimulationActionType.DISCARD ||
      action.payloadHash !== payloadHash
    ) {
      throw new ConflictException('IDEMPOTENCY_KEY_REUSED');
    }
    if (!this.isDiscardResponse(action.responseSnapshot)) {
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
      (session.presentationHold === SimulationPresentationHold.PAYMENT_RESULT ||
        session.presentationHold === SimulationPresentationHold.EVENT_RESULT)
    ) {
      return ['CONTINUE'];
    }
    if (
      session.status === SimulationSessionStatus.ACTIVE &&
      session.presentationHold === SimulationPresentationHold.EVENT_REVEAL &&
      session.events.length === 1
    ) {
      return ['RESOLVE_EVENT'];
    }
    if (
      session.status === SimulationSessionStatus.ACTIVE &&
      session.presentationHold === SimulationPresentationHold.NONE &&
      session.obligations.some(
        (obligation) =>
          obligation.status === SimulationObligationStatus.PAYABLE,
      )
    ) {
      return ['PAY_OBLIGATION'];
    }
    if (
      session.status === SimulationSessionStatus.ACTIVE &&
      !session.timedMode &&
      session.presentationHold === SimulationPresentationHold.NONE &&
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

  private normalizedMoney(value: unknown): string | null {
    const cents = this.moneyToCents(
      typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : value instanceof Prisma.Decimal
          ? value.toString()
          : null,
    );
    return cents === null ? null : this.centsToMoney(cents);
  }

  private normalizedSignedMoney(value: unknown): string | null {
    const candidate =
      typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : value instanceof Prisma.Decimal
          ? value.toString()
          : null;
    if (!candidate || !/^-?\d+\.\d{2}$/.test(candidate)) {
      return null;
    }
    const sign = candidate.startsWith('-') ? -1 : 1;
    const unsignedCents = this.moneyToCents(
      sign < 0 ? candidate.slice(1) : candidate,
    );
    return unsignedCents === null
      ? null
      : this.centsToMoney(sign * unsignedCents);
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

  private isPaymentResponse(value: unknown): value is PaymentResponse {
    return (
      typeof value === 'object' &&
      value !== null &&
      'session' in value &&
      'obligations' in value &&
      'payment' in value &&
      'replayed' in value
    );
  }

  private isEventResolutionResponse(
    value: unknown,
  ): value is EventResolutionResponse {
    return (
      typeof value === 'object' &&
      value !== null &&
      'session' in value &&
      'obligations' in value &&
      'event' in value &&
      'replayed' in value
    );
  }

  private isContinueResponse(value: unknown): value is ContinueResponse {
    return (
      typeof value === 'object' &&
      value !== null &&
      'session' in value &&
      'obligations' in value &&
      'replayed' in value
    );
  }

  private isStatusResponse(value: unknown): value is StatusResponse {
    return (
      typeof value === 'object' &&
      value !== null &&
      'session' in value &&
      'obligations' in value &&
      'replayed' in value
    );
  }

  private isDiscardResponse(value: unknown): value is DiscardResponse {
    if (typeof value !== 'object' || value === null || !('session' in value)) {
      return false;
    }
    const session = this.record(value.session);
    return (
      session?.status === 'ABANDONED' &&
      typeof session.id === 'string' &&
      typeof session.abandonedAt === 'string' &&
      'replayed' in value
    );
  }
}
