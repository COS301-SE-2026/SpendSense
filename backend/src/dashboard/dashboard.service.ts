import { Injectable } from '@nestjs/common';
import { PaymentOccurrenceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: string) {
    const [
      recentScoreEvents,
      gamificationProfile,
      overduePayments,
      recentBadges,
      unreadNotifications,
    ] = await Promise.all([
      this.prisma.scoreEvent.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
        select: {
          id: true,
          userId: true,
          creditProfileId: true,
          occurrenceId: true,
          paymentRecordId: true,
          eventType: true,
          pointsDelta: true,
          scoreBefore: true,
          scoreAfter: true,
          explanation: true,
          calculationMetadata: true,
          createdAt: true,
        },
      }),

      this.prisma.gamificationProfile.findFirst({
        where: {
          userId,
          deletedAt: null,
        },
        select: {
          id: true,
          userId: true,
          coinBalance: true,
          xp: true,
          mascotLevel: true,
          mascotMood: true,
          currentPaymentStreak: true,
          longestPaymentStreak: true,
          currentKnowledgeStreak: true,
          longestKnowledgeStreak: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      this.prisma.paymentOccurrence.findMany({
        where: {
          userId,
          deletedAt: null,
          status: PaymentOccurrenceStatus.OVERDUE,
        },
        orderBy: {
          dueDate: 'asc',
        },
        take: 5,
        select: {
          id: true,
          userId: true,
          obligationId: true,
          scheduleId: true,
          dueDate: true,
          amountDue: true,
          currency: true,
          status: true,
          sequenceNumber: true,
          paidAt: true,
          overdueAt: true,
          missedAt: true,
          createdAt: true,
          updatedAt: true,
          obligation: {
            select: {
              id: true,
              name: true,
              description: true,
              type: true,
              status: true,
              amount: true,
              currency: true,
              priority: true,
              startDate: true,
              endDate: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  iconKey: true,
                  colourKey: true,
                },
              },
            },
          },
        },
      }),

      this.prisma.userBadge.findMany({
        where: {
          userId,
          earnedAt: {
            not: null,
          },
        },
        orderBy: {
          earnedAt: 'desc',
        },
        take: 5,
        select: {
          id: true,
          userId: true,
          badgeDefinitionId: true,
          progress: true,
          earnedAt: true,
          metadata: true,
          createdAt: true,
          badgeDefinition: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
              category: true,
              criteriaType: true,
              criteriaValue: true,
              iconKey: true,
              isActive: true,
            },
          },
        },
      }),

      this.prisma.notification.findMany({
        where: {
          userId,
          readAt: null,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
        select: {
          id: true,
          userId: true,
          type: true,
          title: true,
          message: true,
          sourceType: true,
          sourceId: true,
          readAt: true,
          createdAt: true,
        },
      }),
    ]);

    const userSummary = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        onboardingCompleted: true,
        createdAt: true,
      },
    });

    console.log('Looking up user with ID:', userId);
    console.log('User summary returned:', userSummary);

    const today = new Date();

    const upcomingPayments = await this.prisma.paymentOccurrence.findMany({
      where: {
        userId,
        deletedAt: null,
        status: PaymentOccurrenceStatus.PENDING,
        dueDate: {
          gte: today,
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
      select: {
        id: true,
        amountDue: true,
        currency: true,
        status: true,
        dueDate: true,
        obligation: {
          select: {
            id: true,
            name: true,
            type: true,
            priority: true,
          },
        },
      },
    });

    console.log('Upcoming Payments for User :', upcomingPayments);

    return {
      userSummary,
      recentScoreEvents,
      gamificationProfile,
      upcomingPayments,
      overduePayments,
      recentBadges,
      unreadNotifications,
    };
  }
}
