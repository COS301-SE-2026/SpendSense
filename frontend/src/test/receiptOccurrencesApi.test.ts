import {beforeEach,describe,expect,it,vi} from 'vitest'
import {getEligibleReceiptOccurrences,getReceiptOccurrenceBalance} from '../features/receipts/receiptOccurrencesApi'
import {apiDataFetch} from '../lib/api'

vi.mock('../lib/api',()=>({
    apiDataFetch:vi.fn(),
}))

describe('receiptOccurrencesApi',()=>{
    beforeEach(()=>{
        vi.clearAllMocks()
    })
    it('retrieves the first page of eligible occurrences',async()=>{
        const response={items:[],nextCursor:null}
        vi.mocked(apiDataFetch).mockResolvedValue(response)
        await expect(getEligibleReceiptOccurrences()).resolves.toEqual(response)
        expect(apiDataFetch).toHaveBeenCalledWith('/payments/occurrences/eligible?limit=20')
    })
    it('passes the cursor when loading another page',async()=>{
        vi.mocked(apiDataFetch).mockResolvedValue({items:[],nextCursor:null})
        await getEligibleReceiptOccurrences('next_page')
        expect(apiDataFetch).toHaveBeenCalledWith('/payments/occurrences/eligible?limit=20&cursor=next_page')
    })
    it('retrieves the current balance for an occurrence',async()=>{
        const occurrence={
            id:'occ_123',
            obligationName:'Electricity',
            dueDate:'2026-09-30',
            currency:'ZAR',
            amountDue:'300.00',
            amountPaid:'100.00',
            amountRemaining:'200.00',
            status:'PARTIALLY_PAID',
            canRecord:true,
        }
        vi.mocked(apiDataFetch).mockResolvedValue({occurrence})
        await expect(getReceiptOccurrenceBalance('occ_123')).resolves.toEqual({occurrence})
        expect(apiDataFetch).toHaveBeenCalledWith('/payments/occurrences/occ_123/balance')
    })
})