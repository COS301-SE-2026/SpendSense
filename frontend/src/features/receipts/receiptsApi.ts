
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