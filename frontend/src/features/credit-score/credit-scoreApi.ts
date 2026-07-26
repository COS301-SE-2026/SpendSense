import { apiFetch } from '../../lib/api'
import type { ApiResponse } from '../../types'
import type { CreditScore } from '../../types/credit-scoreTypes'


// planned endpoints:
// GET /api/v1/credit-score

export async function getCrditScore(): Promise<ApiResponse<CreditScore>> {
    return apiFetch<ApiResponse<CreditScore>>('/credit-score')
}