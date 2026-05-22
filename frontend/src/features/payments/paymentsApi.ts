import {apiFetch} from '../../lib/api'

// paymentsApi: payment occurrence timeline and payment logging
// logPayment triggers the full behavioural loop:
// updates occurrence status -> creates ScoreEvent -> updates CreditProfile -> awards coins -> updates GamificationProfile
// never pass userId in the request body (backend derives it from JWT)

// planned endpoints:
// GET /api/v1/payment-occurrences/upcoming
// GET /api/v1/payment-occurrences/:id
// POST /api/v1/payments/log
// GET /api/v1/payments

export async function getUpcomingOccurrences(params?:{
    from?: string
    to?: string
    status?: string
    obligationId?: string
    page?: number
    perPage?: number
}) 
{
    const query = new URLSearchParams()
    if(params?.from){
        query.set('from', params.from)
    }
    if(params?.to){
        query.set('to', params.to)
    }
    if(params?.status){
        query.set('status', params.status)
    }
    if(params?.obligationId){
        query.set('obligationId', params.obligationId)
    }
    if(params?.page){
        query.set('page', String(params.page))
    }
    if(params?.perPage){
        query.set('perPage', String(params.perPage))
    }
    const qs = query.toString() ? `?${query.toString()}` : ''
    return apiFetch(`/payment-occurrences/upcoming${qs}`)
}

export async function logPayment(body:{
    occurrenceId: string
    amountPaid: number
    paidDate: string
    notes?: string
}) 
{
    return apiFetch('/payments/log', {method: 'POST', body: JSON.stringify(body)})
}