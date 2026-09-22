
import {beforeEach,describe,expect,it,vi} from 'vitest'
import {confirmReceiptPayment,getReceiptScan,scanReceipt} from '../features/receipts/receiptsApi'
import {apiDataFetch} from '../lib/api'

vi.mock('../lib/api',()=>({
    apiDataFetch:vi.fn(),
}))

describe('receiptsApi',()=>{
    beforeEach(()=>{
        vi.clearAllMocks()
    })
    it('uploads a receipt image as form data',async()=>{
        const file=new File(['receipt'],'receipt.jpg',{type:'image/jpeg'})
        vi.mocked(apiDataFetch).mockResolvedValue({
            id:'scan_abc',
            status:'READY_FOR_REVIEW',
            expiresAt:'2026-09-17T12:00:00.000Z',
            extraction:{
                amountCandidates:[],
                merchant:null,
                receiptDate:null,
                warnings:[],
            },
            preselectedOccurrenceId:null,
        })
        await scanReceipt(file)
        expect(apiDataFetch).toHaveBeenCalledTimes(1)
        const [path,options]=vi.mocked(apiDataFetch).mock.calls[0]
        expect(path).toBe('/receipts/scans')
        expect(options?.method).toBe('POST')
        expect(options?.body).toBeInstanceOf(FormData)
        const formData=options?.body as FormData
        expect(formData.get('image')).toBe(file)
        expect(formData.get('preselectedOccurrenceId')).toBeNull()
    })
    it('includes a preselected occurrence when provided',async()=>{
        const file=new File(['receipt'],'receipt.png',{type:'image/png'})
        vi.mocked(apiDataFetch).mockResolvedValue({
            id:'scan_abc',
            status:'READY_FOR_REVIEW',
            expiresAt:'2026-09-17T12:00:00.000Z',
            extraction:{
                amountCandidates:[],
                merchant:null,
                receiptDate:null,
                warnings:[],
            },
            preselectedOccurrenceId:'occ_123',
        })
        await scanReceipt(file,'occ_123')
        const [,options]=vi.mocked(apiDataFetch).mock.calls[0]
        const formData=options?.body as FormData
        expect(formData.get('image')).toBe(file)
        expect(formData.get('preselectedOccurrenceId')).toBe('occ_123')
    })
    it('returns the receipt scan response',async()=>{
        const file=new File(['receipt'],'receipt.jpg',{type:'image/jpeg'})
        const response={
            id:'scan_abc',
            status:'READY_FOR_REVIEW' as const,
            expiresAt:'2026-09-17T12:00:00.000Z',
            extraction:{
                amountCandidates:[
                    {
                        value:'315.02',
                        currency:'ZAR',
                        confidence:'HIGH' as const,
                        label:'total',
                    },
                ],
                merchant:{
                    value:'Checkers',
                    confidence:'MEDIUM' as const,
                },
                receiptDate:{
                    value:'2026-09-16',
                    confidence:'MEDIUM' as const,
                },
                warnings:[],
            },
            preselectedOccurrenceId:null,
        }
        vi.mocked(apiDataFetch).mockResolvedValue(response)
        await expect(scanReceipt(file)).resolves.toEqual(response)
    })
    it('retrieves a receipt scan draft by ID',async()=>{
        const response={
            id:'scan_abc',
            status:'READY_FOR_REVIEW' as const,
            expiresAt:'2026-09-21T12:00:00.000Z',
            extraction:{
                amountCandidates:[],
                merchant:null,
                receiptDate:null,
                warnings:[],
            },
            preselectedOccurrenceId:'occ_123',
        }
        vi.mocked(apiDataFetch).mockResolvedValue(response)
        await expect(getReceiptScan('scan_abc')).resolves.toEqual(response)
        expect(apiDataFetch).toHaveBeenCalledWith('/receipts/scans/scan_abc')
    })
    it('confirms a receipt with an idempotency key',async()=>{
        const body={
            occurrenceId:'occ_123',
            amount:'100.00',
            currency:'ZAR',
            paidDate:'2026-09-20',
            acknowledged:true as const,
        }
        const response={
            replayed:false,
            contribution:{
                id:'pc_789',
                occurrenceId:'occ_123',
                amount:'100.00',
                currency:'ZAR',
                paidDate:'2026-09-20',
                source:'RECEIPT_SCAN',
                state:'POSTED',
                receiptScanId:'scan_abc',
                createdAt:'2026-09-20T12:00:00.000Z',
            },
            occurrence:{
                id:'occ_123',
                obligationId:'obl_456',
                obligationName:'Electricity',
                dueDate:'2026-09-30',
                currency:'ZAR',
                amountDue:'300.00',
                amountPaid:'100.00',
                amountRemaining:'200.00',
                status:'PARTIALLY_PAID',
                canRecord:true,
            },
            settlement:null,
            scoreImpact:null,
            rewards:null,
        }
        vi.mocked(apiDataFetch).mockResolvedValue(response)
        await expect(confirmReceiptPayment('scan_abc',body,'key_123')).resolves.toEqual(response)
        expect(apiDataFetch).toHaveBeenCalledWith('/receipts/scans/scan_abc/confirm',{
            method:'POST',
            headers:{'Idempotency-Key':'key_123'},
            body:JSON.stringify(body),
        })
    })
    it('returns the replayed confirmation result',async()=>{
        const body={
            occurrenceId:'occ_123',
            amount:'100.00',
            currency:'ZAR',
            paidDate:'2026-09-20',
            acknowledged:true as const,
        }
        const response={
            replayed:true,
            contribution:{
                id:'pc_789',
                occurrenceId:'occ_123',
                amount:'100.00',
                currency:'ZAR',
                paidDate:'2026-09-20',
                source:'RECEIPT_SCAN',
                state:'POSTED',
                receiptScanId:'scan_abc',
                createdAt:'2026-09-20T12:00:00.000Z',
            },
            occurrence:{
                id:'occ_123',
                obligationId:'obl_456',
                obligationName:'Electricity',
                dueDate:'2026-09-30',
                currency:'ZAR',
                amountDue:'300.00',
                amountPaid:'100.00',
                amountRemaining:'200.00',
                status:'PARTIALLY_PAID',
                canRecord:true,
            },
            settlement:null,
            scoreImpact:null,
            rewards:null,
        }
        vi.mocked(apiDataFetch).mockResolvedValue(response)
        await expect(confirmReceiptPayment('scan_abc',body,'key_123')).resolves.toEqual(response)
        expect(apiDataFetch).toHaveBeenCalledWith('/receipts/scans/scan_abc/confirm',{
            method:'POST',
            headers:{'Idempotency-Key':'key_123'},
            body:JSON.stringify(body),
        })
    })
})