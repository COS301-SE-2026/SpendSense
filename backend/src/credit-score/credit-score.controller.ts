import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import { UpdateMonthlyBudgetDto } from './dto/update-monthly-budget.dto';
import { CreditScoreService } from './credit-score.service';

@ApiTags('credit-score')
@ApiBearerAuth()
@Controller('credit-score')
@UseGuards(SupabaseJwtGuard)
export class CreditScoreController {
    constructor(private readonly creditScoreService: CreditScoreService) { }

    @ApiOperation({
        summary: "Get the authenticated user credit score",
        description: "Returns the current simulated SpendSense credit score for the Supabase-authenticated user.",
    })
    @ApiOkResponse({
        description: "The current simulated credit score, wrapped by the global response envelope.",
        schema: {
            example: {
                data: {
                    profile: {
                        currentScore: 684,
                        previousScore: 672,
                        scoreTier: 'GOOD',
                        onTimePaymentCount: 4,
                        latePaymentCount: 1,
                        missedPaymentCount: 0,
                        currentUtilisationScore: '0.75',
                        lastCalculatedAt: '2026-07-15T10:00:00.000Z',
                    },
                    calculation: {
                        modelVersion: 'SPENDSENSE_V1',
                        calculatedScore: 684,
                        finalScore: 684,
                        scoreTier: 'GOOD',
                        confidence: 'MEDIUM',
                    },
                },
            },
        },
    })

    @ApiUnauthorizedResponse({description: "Missing, malformed, or invalid Supabase Bearer token."})


    @Get()
    async getCreditScore(@CurrentAuthUser() authUser: AuthUser) { 
        return this.creditScoreService.getCreditScore(authUser);
    }

    @ApiOperation({
        summary: "Update the authenticated user monthly budget",
        description: "Updates the user monthly budget and recalculates the simulated SpendSense credit score.",
    })

    @ApiOkResponse({ description: "The updated simulated credit score after recalculation." })
    
    @ApiUnauthorizedResponse({ description: "Missing, malformed, or invalid Supabase Bearer token."})

    @Patch('monthly-budget')
    async updateMonthlyBudget(
        @CurrentAuthUser() authUser: AuthUser,
        @Body() dto: UpdateMonthlyBudgetDto,
    ) 
    {
        return this.creditScoreService.updateMonthlyBudgetAndRecalculate(
            authUser,
            dto.monthlyBudget,
        );
    }

    @ApiOperation({
        summary: "List authenticated user credit score events",
        description: "Returns the simulated credit score history for the Supabase-authenticated user, ordered newest first.",
    })

    @ApiOkResponse({
        description: "Credit score events, wrapped by the global response envelope.",
        schema: {
            example: {
                data: [
                    {
                        id: 'score_event_1',
                        eventType: 'PAYMENT_ON_TIME',
                        pointsDelta: 8,
                        scoreBefore: 704,
                        scoreAfter: 712,
                        explanation: 'Paid Netflix Subscription on time.',
                        createdAt: '2026-05-20T10:00:00.000Z',
                    },
                ],
            },
        },
    })

    @ApiUnauthorizedResponse({ description: "Missing, malformed, or invalid Supabase Bearer token."})

    @Get('events')
    async getCreditScoreEvents(@CurrentAuthUser() authUser: AuthUser) {
        return this.creditScoreService.getCreditScoreEvents(authUser);
    }
}