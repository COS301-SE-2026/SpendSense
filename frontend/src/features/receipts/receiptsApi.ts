
import {apiDataFetch} from '../../lib/api'

export type ReceiptConfidence='HIGH'|'MEDIUM'|'LOW'|'UNKNOWN'

export type ReceiptAmountCandidate={
    value:string
    currency:string
    confidence:ReceiptConfidence
    label:string
}

export type ReceiptExtractionValue={
    value:string
    confidence:ReceiptConfidence
}

export type ReceiptExtraction={
    amountCandidates:ReceiptAmountCandidate[]
    merchant:ReceiptExtractionValue|null
    receiptDate:ReceiptExtractionValue|null
    warnings:string[]
}

export type ReceiptScan={
    id:string
    status:'READY_FOR_REVIEW'
    expiresAt:string
    extraction:ReceiptExtraction
    preselectedOccurrenceId:string|null
}

export type ReceiptConfirmationBody={
    occurrenceId:string
    amount:string
    currency:string
    paidDate:string
    notes?:string
    acknowledged:true
}

export type ReceiptContribution={
    id:string
    occurrenceId:string
    amount:string
    currency:string
    paidDate:string
    source:'RECEIPT_SCAN'
    state:'POSTED'
    receiptScanId:string
    createdAt:string
}

export type ReceiptConfirmedOccurrence={
    id:string
    obligationId:string
    obligationName:string
    dueDate:string
    currency:string
    amountDue:string
    amountPaid:string
    amountRemaining:string
    status:'PENDING'|'PARTIALLY_PAID'|'OVERDUE'|'PAID'|'PAID_LATE'|'MISSED'|'CANCELLED'
    canRecord:boolean
}

export type ReceiptConfirmationResult={
    replayed:boolean
    contribution:ReceiptContribution
    occurrence:ReceiptConfirmedOccurrence
    settlement:unknown|null
    scoreImpact:unknown|null
    rewards:unknown|null
}

export async function scanReceipt(image:File,preselectedOccurrenceId?:string){
    const formData=new FormData()
    formData.append('image',image)
    if(preselectedOccurrenceId)formData.append('preselectedOccurrenceId',preselectedOccurrenceId)
    return apiDataFetch<ReceiptScan>('/receipts/scans',{
        method:'POST',
        body:formData,
    })
}

export async function getReceiptScan(scanId:string){
    return apiDataFetch<ReceiptScan>(`/receipts/scans/${encodeURIComponent(scanId)}`)
}

export async function confirmReceiptPayment(
    scanId:string,
    body:ReceiptConfirmationBody,
    idempotencyKey:string,
){
    return apiDataFetch<ReceiptConfirmationResult>(`/receipts/scans/${encodeURIComponent(scanId)}/confirm`,{
        method:'POST',
        headers:{'Idempotency-Key':idempotencyKey},
        body:JSON.stringify(body),
    })
}