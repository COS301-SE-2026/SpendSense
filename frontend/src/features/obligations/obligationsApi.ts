import {apiFetch} from '../../lib/api'
import type {ApiResponse} from '../../types'

export type ObligationType =
    | 'RENT'
    | 'SUBSCRIPTION'
    | 'BNPL'
    | 'UTILITY'
    | 'IOU'
    | 'CUSTOM'

export type ObligationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type ScheduleFrequency =
    | 'ONCE'
    | 'WEEKLY'
    | 'MONTHLY'
    | 'FIXED_INSTALLMENT'

export type ReminderChannel = 'IN_APP' | 'EMAIL' | 'PUSH' | 'SMS'

export type CreateObligationRequest = {
    name: string
    description?: string
    type: ObligationType
    categoryId: string
    amount: number
    currency: string
    priority?: ObligationPriority
    startDate: string
    endDate?: string | null
    schedule: {
        frequency: ScheduleFrequency
        interval: number
        dayOfMonth?: number
        totalOccurrences?: number | null
    }
    reminders?: {
        enabled: boolean
        daysBefore: number[]
        channels: ReminderChannel[]
    }
}

export type CreateObligationResponse = ApiResponse<{
    rewards: {
        xpAwarded: number
        xp: number
        mascotLevel: number
        leveledUp: boolean
    }
}>

// obligationsApi: financial obligation CRUD
// POST creates the obligation, schedule, payment occurrences, reminders, & a UserEvent
// all in a single backend transaction (never userId in the request body)
// GET returns only the authenticated users active obligations, paginated

// planned endpoints:
// POST /api/v1/obligations
// GET /api/v1/obligations
// GET /api/v1/obligations/:id
// PATCH /api/v1/obligations/:id
// DELETE /api/v1/obligations/:id

export async function createObligation(body: CreateObligationRequest): Promise<CreateObligationResponse>
{
    return apiFetch<CreateObligationResponse>('/obligations', {method: 'POST', body: JSON.stringify(body)})
}

export async function getObligations(params?: {page?: number; perPage?: number}){
    const query = new URLSearchParams()
    if(params?.page){
        query.set('page', String(params.page))
    }
    if(params?.perPage){
        query.set('perPage', String(params.perPage))
    }

    const qs = query.toString() ? `?${query.toString()}` : ''
    return apiFetch(`/obligations${qs}`)
}
