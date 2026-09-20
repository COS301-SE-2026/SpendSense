import {apiDataFetch} from '../../lib/api'

export type ReceiptOccurrenceStatus='PENDING'|'PARTIALLY_PAID'|'OVERDUE'|'PAID'|'PAID_LATE'|'MISSED'|'CANCELLED'

export type ReceiptOccurrence={
    id:string
    obligationId?:string
    obligationName:string
    dueDate:string
    currency:string
    amountDue:string
    amountPaid:string
    amountRemaining:string
    status:ReceiptOccurrenceStatus
    canRecord?:boolean
}

export type EligibleReceiptOccurrences={
    items:ReceiptOccurrence[]
    nextCursor:string|null
}

export type ReceiptOccurrenceBalance={
    occurrence:ReceiptOccurrence
}

export async function getEligibleReceiptOccurrences(cursor?:string){
    const query=new URLSearchParams()
    query.set('limit','20')
    if(cursor)query.set('cursor',cursor)
    return apiDataFetch<EligibleReceiptOccurrences>(`/payments/occurrences/eligible?${query.toString()}`)
}

export async function getReceiptOccurrenceBalance(occurrenceId:string){
    return apiDataFetch<ReceiptOccurrenceBalance>(`/payments/occurrences/${encodeURIComponent(occurrenceId)}/balance`)
}