import { Injectable } from '@nestjs/common';

@Injectable()
export class InsightsService {
    getInsights(userId: string) {
        return {
            cards: [],
        };
    }
}
