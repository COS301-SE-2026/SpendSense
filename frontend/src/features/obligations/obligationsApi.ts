import {apiFetch} from '../../lib/api'

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

export async function createObligation(body:{
    name: string
    description?: string
    type: 'RENT' | 'SUBSCRIPTION' | 'BNPL' | 'UTILITY' | 'IOU' | 'CUSTOM'
    categoryId: string
    amount: number
    currency: string
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    startDate: string
    endDate?: string | null
    schedule:{
        frequency: 'ONCE' | 'WEEKLY' | 'MONTHLY' | 'FIXED_INSTALLMENTS'
        interval: number
        dayOfMonth?: number
        totalOccurrences?: number | null
    }
    reminders?: {enabled: boolean; daysBefore: number[]; channels: string[]}
}) 
{
    return apiFetch('/obligations', {method: 'POST', body: JSON.stringify(body)})
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