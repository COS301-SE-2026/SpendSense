import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { InsightsService } from "./insights.service";

describe("InsightsService", () => {
    let service: InsightsService;

    beforeEach(async () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-07-20T12:00:00.000Z"));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InsightsService,
                {
                    provide: PrismaService,
                    useValue: {},
                },
            ],
        }).compile();

        service = module.get<InsightsService>(InsightsService);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it("returns all five rule-based cards from one response", async () => {
        jest.spyOn(service as any, "getOnTimePaymentRate").mockResolvedValue({
            currentPeriod: {
                onTimePaymentCount: 3,
                latePaymentCount: 1,
                missedPaymentCount: 0,
                eligiblePaymentCount: 4,
                onTimePaymentPercentage: 75,
            },
            previousPeriod: {
                onTimePaymentCount: 2,
                latePaymentCount: 2,
                missedPaymentCount: 0,
                eligiblePaymentCount: 4,
                onTimePaymentPercentage: 50,
            },
            percentagePointChange: 25,
            hasEnoughData: true,
        });

        jest.spyOn(service as any, "getObligationTrend").mockResolvedValue({
            currency: "ZAR",
            currentMonthAmount: 11000,
            previousMonthAmount: 10000,
            amountChange: 1000,
            percentageChange: 10,
            hasEnoughData: true,
        });

        jest.spyOn(service as any, "getUpcomingPressure").mockResolvedValue({
            currency: "ZAR",
            windowDays: 7,
            paymentCount: 2,
            obligationCount: 2,
            upcomingAmount: 2500,
            recentAverageWeeklyAmount: 3000,
            pressureRatio: 0.8,
            nextDueDate: "2026-07-22T00:00:00.000Z",
            hasEnoughData: true,
        });

        jest.spyOn(service as any, "getCategoryBreakdown").mockResolvedValue({
            currency: "ZAR",
            currentMonthTotal: 11000,
            breakdown: [
                {
                    type: "RENT",
                    amount: 6200,
                    percentage: 56.4,
                    occurrenceCount: 1,
                },
            ],
            dominantType: {
                type: "RENT",
                amount: 6200,
                percentage: 56.4,
                occurrenceCount: 1,
            },
            hasEnoughData: true,
        });

        jest.spyOn(service as any, "getPaymentStreak").mockResolvedValue({
            currentOnTimeStreak: 4,
            longestOnTimeStreak: 6,
            resolvedOutcomeCount: 12,
            currentMonthOnTimeCount: 3,
            currentMonthLateCount: 0,
            currentMonthMissedCount: 0,
            currentMonthOverdueCount: 0,
            hasEnoughData: true,
        });

        const result = await service.getInsights("internal-user-456");

        expect(result.asOf).toBe("2026-07-20T12:00:00.000Z");
        expect(result.insights).toHaveLength(5);
        expect(result.insights.map((insight) => insight.key)).toEqual(["on-time-rate", "obligation-trend", "upcoming-pressure", "category-breakdown", "payment-streak",]);
    });
});