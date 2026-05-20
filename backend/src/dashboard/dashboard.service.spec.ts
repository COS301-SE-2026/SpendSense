import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { Currency, PaymentOccurrenceStatus } from '@prisma/client';
import '@jest/globals';
import { jest } from '@jest/globals';

describe('DashboardService', () => {

	let service: DashboardService;
	const mockPrismaService = {
		user: { findFirst: jest.fn<() => Promise<any>>() },
		creditProfile: { findFirst: jest.fn<() => Promise<any>>() },
		scoreEvent: { findMany: jest.fn<() => Promise<any>>() },
		gamificationProfile: { findFirst: jest.fn<() => Promise<any>>() },
		paymentOccurrence: { findMany: jest.fn<() => Promise<any>>() },
		userBadge: { findMany: jest.fn<() => Promise<any>>() },
		notification: { findMany: jest.fn<() => Promise<any>>() },
	};
	const userId = 'user-1';

	const mockUserSummary = {
		id: userId,
		email: 'test@spendsense.local',
		displayName: 'Test User',
		avatarUrl: null,
		onboardingCompleted: true,
		createdAt: new Date('2026-05-01'),
	};

	const mockCreditProfile = {
		id: 'credit-profile-1',
		userId,
		currentScore: 650,
		previousScore: 630,
		scoreTier: 'GOOD',
		onTimePaymentCount: 5,
		latePaymentCount: 1,
		missedPaymentCount: 0,
		currentUtilisationScore: 80,
		lastCalculatedAt: new Date('2026-05-18'),
		createdAt: new Date('2026-05-01'),
		updatedAt: new Date('2026-05-18'),
	};

	const mockRecentScoreEvents = [
		{
			id: 'score-event-1',
			userId,
			creditProfileId: 'credit-profile-1',
			occurrenceId: 'occurrence-1',
			paymentRecordId: 'payment-record-1',
			eventType: 'PAYMENT_ON_TIME',
			pointsDelta: 10,
			scoreBefore: 640,
			scoreAfter: 650,
			explanation: 'On-time payment improved your score.',
			calculationMetadata: {},
			createdAt: new Date('2026-05-18'),
		},
	];

	const mockGamificationProfile = {
		id: 'gamification-profile-1',
		userId,
		coinBalance: 100,
		xp: 250,
		mascotLevel: 2,
		mascotMood: 'HAPPY',
		currentPaymentStreak: 3,
		longestPaymentStreak: 5,
		currentKnowledgeStreak: 1,
		longestKnowledgeStreak: 2,
		createdAt: new Date('2026-05-01'),
		updatedAt: new Date('2026-05-18'),
	};

	const mockUpcomingPayments = [
		{
			id: 'occurrence-1',
			userId,
			obligationId: 'obligation-1',
			scheduleId: 'schedule-1',
			dueDate: new Date('2026-05-25'),
			amountDue: 750,
			currency: Currency.ZAR,
			status: PaymentOccurrenceStatus.PENDING,
			sequenceNumber: 1,
			paidAt: null,
			overdueAt: null,
			missedAt: null,
			createdAt: new Date('2026-05-01'),
			updatedAt: new Date('2026-05-01'),
			obligation: {
				id: 'obligation-1',
				name: 'Rent',
				description: 'Monthly rent',
				type: 'RENT',
				status: 'ACTIVE',
				amount: 750,
				currency: Currency.ZAR,
				priority: 'HIGH',
				startDate: new Date('2026-05-01'),
				endDate: null,
				category: {
					id: 'category-1',
					name: 'Housing',
					iconKey: 'home',
					colourKey: 'blue',
				},
			},
		},
	];

	const mockOverduePayments = [
		{
			id: 'occurrence-2',
			userId,
			obligationId: 'obligation-2',
			scheduleId: 'schedule-2',
			dueDate: new Date('2026-05-10'),
			amountDue: 199,
			currency: Currency.ZAR,
			status: PaymentOccurrenceStatus.OVERDUE,
			sequenceNumber: 1,
			paidAt: null,
			overdueAt: new Date('2026-05-11'),
			missedAt: null,
			createdAt: new Date('2026-05-01'),
			updatedAt: new Date('2026-05-11'),
			obligation: {
				id: 'obligation-2',
				name: 'Netflix',
				description: 'Subscription',
				type: 'SUBSCRIPTION',
				status: 'ACTIVE',
				amount: 199,
				currency: Currency.ZAR,
				priority: 'MEDIUM',
				startDate: new Date('2026-05-01'),
				endDate: null,
				category: {
					id: 'category-2',
					name: 'Subscriptions',
					iconKey: 'repeat',
					colourKey: 'purple',
				},
			},
		},
	];

	const mockRecentBadges = [
		{
			id: 'user-badge-1',
			userId,
			badgeDefinitionId: 'badge-definition-1',
			progress: 100,
			earnedAt: new Date('2026-05-18'),
			metadata: {},
			createdAt: new Date('2026-05-01'),
			badgeDefinition: {
				id: 'badge-definition-1',
				code: 'FIRST_PAYMENT',
				name: 'First Payment',
				description: 'Logged your first payment',
				category: 'PAYMENTS',
				criteriaType: 'COUNT',
				criteriaValue: 1,
				iconKey: 'star',
				isActive: true,
			},
		},
	];

	const mockUnreadNotifications = [
		{
			id: 'notification-1',
			userId,
			type: 'PAYMENT_REMINDER',
			title: 'Payment due soon',
			message: 'Your rent payment is due soon.',
			sourceType: 'PAYMENT_OCCURRENCE',
			sourceId: 'occurrence-1',
			readAt: null,
			createdAt: new Date('2026-05-18'),
		},
	];

	beforeEach(async () => {
		jest.clearAllMocks();

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				DashboardService,
				{
					provide: PrismaService,
					useValue: mockPrismaService,
				},
			],
		}).compile();

		service = module.get<DashboardService>(DashboardService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('getDashboard()', () => {

		it('should return data for the authed user', async () => {
			mockPrismaService.user.findFirst.mockResolvedValue(mockUserSummary);
			mockPrismaService.creditProfile.findFirst.mockResolvedValue(mockCreditProfile);
			mockPrismaService.scoreEvent.findMany.mockResolvedValue(mockRecentScoreEvents);
			mockPrismaService.gamificationProfile.findFirst.mockResolvedValue(mockGamificationProfile);
			mockPrismaService.paymentOccurrence.findMany.mockResolvedValueOnce(mockUpcomingPayments).mockResolvedValueOnce(mockOverduePayments);
			mockPrismaService.userBadge.findMany.mockResolvedValue(mockRecentBadges);
			mockPrismaService.notification.findMany.mockResolvedValue(mockUnreadNotifications);

			const result = await service.getDashboard(userId);

			expect(result).toEqual({
				userSummary: mockUserSummary,
				creditProfile: mockCreditProfile,
				recentScoreEvents: mockRecentScoreEvents,
				gamificationProfile: mockGamificationProfile,
				upcomingPayments: mockUpcomingPayments,
				overduePayments: mockOverduePayments,
				recentBadges: mockRecentBadges,
				unreadNotifications: mockUnreadNotifications,
			});

		});
	});
});