import { Injectable } from '@nestjs/common';
import { ScoreEventType, ScoreTier } from '@prisma/client';
import type { AuthUser } from '../auth/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

type CreditProfileShape = {
  currentScore: number;
  previousScore: number;
  scoreTier: ScoreTier;
  onTimePaymentCount: number;
  latePaymentCount: number;
  missedPaymentCount: number;
  lastCalculatedAt: Date | null;
};

type ScoreEventShape = {
  id: string;
  eventType: ScoreEventType;
  pointsDelta: number;
  scoreBefore: number;
  scoreAfter: number;
  explanation: string;
  createdAt: Date;
};

@Injectable()
export class CreditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async getCreditProfile(authUser: AuthUser) {
    const user = await this.usersService.findOrCreateUser(authUser);
    const creditProfile =
      user.creditProfile ??
      (await this.prisma.creditProfile.create({
        data: {
          userId: user.id,
          currentScore: 600,
          previousScore: 600,
          scoreTier: ScoreTier.GOOD,
        },
        select: this.creditProfileSelect,
      }));

    return this.toCreditProfileResponse(creditProfile);
  }

  async getCreditProfileEvents(authUser: AuthUser) {
    const user = await this.usersService.findOrCreateUser(authUser);
    const events = await this.prisma.scoreEvent.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        eventType: true,
        pointsDelta: true,
        scoreBefore: true,
        scoreAfter: true,
        explanation: true,
        createdAt: true,
      },
    });

    return events.map((event) => this.toScoreEventResponse(event));
  }

  private readonly creditProfileSelect = {
    currentScore: true,
    previousScore: true,
    scoreTier: true,
    onTimePaymentCount: true,
    latePaymentCount: true,
    missedPaymentCount: true,
    lastCalculatedAt: true,
  };

  private toCreditProfileResponse(profile: CreditProfileShape) {
    return {
      currentScore: profile.currentScore,
      previousScore: profile.previousScore,
      scoreTier: profile.scoreTier,
      onTimeCount: profile.onTimePaymentCount,
      lateCount: profile.latePaymentCount,
      missedCount: profile.missedPaymentCount,
      lastCalculatedAt: profile.lastCalculatedAt,
    };
  }

  private toScoreEventResponse(event: ScoreEventShape) {
    return {
      id: event.id,
      eventType: event.eventType,
      pointsDelta: event.pointsDelta,
      scoreBefore: event.scoreBefore,
      scoreAfter: event.scoreAfter,
      explanation: event.explanation,
      createdAt: event.createdAt,
    };
  }
}
