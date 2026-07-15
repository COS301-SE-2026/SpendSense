import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InsightsService } from './insights.service';

@ApiTags('Insights')
@ApiBearerAuth()
@Controller('insights')
export class InsightsController {
    constructor(private readonly insightsService: InsightsService){}

    @Get()
    @ApiOperation({
        summary: "Get stats-based insights",
        description:'Returns deterministic financial insights calculated from the authenticated user’s obligations and payment history.',
    })
    @ApiOkResponse({
        description: 'Stats-based insights returned successfully.',
        schema: {
            example: {
                generatedAt: '2026-07-15T08:00:00.000Z',
                cards: [],
            },
        },
    })
    getInsights() {
        return this.insightsService.getInsights();
    }
}