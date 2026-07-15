import { Injectable } from '@nestjs/common';

@Injectable()
export class InsightsService {
    getInsights() {
        return {
            cards: [],
        };
    }
}
