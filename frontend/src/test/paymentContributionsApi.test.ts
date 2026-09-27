import {beforeEach,describe,expect,it,vi} from 'vitest'
import {createManualContribution,type ManualContributionBody,type ManualContributionResult} from '../features/payments/paymentsApi'
import {apiDataFetch} from '../lib/api'

vi.mock('../lib/api',()=>({
    apiFetch:vi.fn(),
    apiDataFetch:vi.fn(),
}))

const contributionBody:ManualContributionBody={
    occurrenceId:'123e4567-e89b-42d3-a456-426614174001',
    amount:'100.00',
    currency:'ZAR',
    paidDate:'2026-09-20',
    notes:'Cash payment',
}

const contributionResponse:ManualContributionResult={
    replayed:false,
    contribution:{
        id:'123e4567-e89b-42d3-a456-426614174002',
        occurrenceId:'123e4567-e89b-42d3-a456-426614174001',
        obligationId:'123e4567-e89b-42d3-a456-426614174003',
        amount:'100.00',
        currency:'ZAR',
        paidDate:'2026-09-20T00:00:00.000Z',
        source:'MANUAL',
        state:'POSTED',
        receiptScanId:null,
        notes:'Cash payment',
        createdAt:'2026-09-20T12:00:00.000Z',
    },
    occurrence:{
        id:'123e4567-e89b-42d3-a456-426614174001',
        obligationId:'123e4567-e89b-42d3-a456-426614174003',
        obligationName:'Electricity',
        dueDate:'2026-09-30T00:00:00.000Z',
        amountDue:'300.00',
        amountPaid:'100.00',
        amountRemaining:'200.00',
        currency:'ZAR',
        status:'PARTIALLY_PAID',
        paidAt:null,
    },
    settlement:null,
    scoreImpact:null,
    rewards:null,
    paymentImpact:null,
}

describe('paymentContributionsApi',()=>{
    beforeEach(()=>{
        vi.clearAllMocks()
    })
    it('sends a manual contribution to the correct endpoint',async()=>{
        vi.mocked(apiDataFetch).mockResolvedValue(contributionResponse)
        await createManualContribution(contributionBody,'123e4567-e89b-42d3-a456-426614174000')
        expect(apiDataFetch).toHaveBeenCalledWith('/payments/contributions',{
            method:'POST',
            headers:{'Idempotency-Key':['123e4567','e89b','42d3','a456','426614174000'].join('-')},
            body:JSON.stringify(contributionBody),
        })
    })
    it('sends decimal-string amounts without converting them to numbers',async()=>{
        vi.mocked(apiDataFetch).mockResolvedValue(contributionResponse)
        await createManualContribution({...contributionBody,amount:'100.50'},'123e4567-e89b-42d3-a456-426614174000')
        const [,options]=vi.mocked(apiDataFetch).mock.calls[0]
        expect(JSON.parse(options?.body as string)).toMatchObject({
            amount:'100.50',
            currency:'ZAR',
        })
    })
    it('allows notes to be omitted',async()=>{
        vi.mocked(apiDataFetch).mockResolvedValue(contributionResponse)
        const {notes,...body}=contributionBody
        expect(notes).toBe('Cash payment')
        await createManualContribution(body,'123e4567-e89b-42d3-a456-426614174000')
        const [,options]=vi.mocked(apiDataFetch).mock.calls[0]
        expect(JSON.parse(options?.body as string)).toEqual(body)
    })
    it('returns the partial contribution and current remaining balance',async()=>{
        vi.mocked(apiDataFetch).mockResolvedValue(contributionResponse)
        const result=await createManualContribution(contributionBody,'123e4567-e89b-42d3-a456-426614174000')
        expect(result.contribution.amount).toBe('100.00')
        expect(result.contribution.source).toBe('MANUAL')
        expect(result.contribution.receiptScanId).toBeNull()
        expect(result.occurrence.amountDue).toBe('300.00')
        expect(result.occurrence.amountPaid).toBe('100.00')
        expect(result.occurrence.amountRemaining).toBe('200.00')
        expect(result.occurrence.status).toBe('PARTIALLY_PAID')
        expect(result.occurrence.paidAt).toBeNull()
        expect(result.settlement).toBeNull()
        expect(result.scoreImpact).toBeNull()
        expect(result.rewards).toBeNull()
        expect(result.paymentImpact).toBeNull()
    })
    it('returns the settlement and rewards when a contribution completes a payment',async()=>{
        const completed:ManualContributionResult={
            ...contributionResponse,
            occurrence:{
                ...contributionResponse.occurrence,
                amountPaid:'300.00',
                amountRemaining:'0.00',
                status:'PAID',
                paidAt:'2026-09-20T00:00:00.000Z',
            },
            settlement:{isLate:false,daysLate:0},
            scoreImpact:{
                scoreEventId:'score_123',
                previousScore:712,
                currentScore:720,
                delta:8,
                tierBefore:'GOOD',
                tierAfter:'GOOD',
                explanation:'Paid Electricity on time.',
            },
            rewards:{
                coinsAwarded:15,
                xpAwarded:10,
                coinBalance:100,
                xp:850,
                currentPaymentStreak:5,
                longestPaymentStreak:5,
                mascotMood:'HAPPY',
                badgesEarned:[],
            },
            paymentImpact:{
                isLate:false,
                daysLate:0,
                simulatedInterest:0,
            },
        }
        vi.mocked(apiDataFetch).mockResolvedValue(completed)
        const result=await createManualContribution(contributionBody,'123e4567-e89b-42d3-a456-426614174000')
        expect(result.occurrence.status).toBe('PAID')
        expect(result.occurrence.amountRemaining).toBe('0.00')
        expect(result.settlement).toEqual({isLate:false,daysLate:0})
        expect(result.scoreImpact?.delta).toBe(8)
        expect(result.rewards?.coinsAwarded).toBe(15)
        expect(result.paymentImpact?.simulatedInterest).toBe(0)
    })
    it('returns an idempotent replay response',async()=>{
        vi.mocked(apiDataFetch).mockResolvedValue({
            ...contributionResponse,
            replayed:true,
        })
        const result=await createManualContribution(contributionBody,'123e4567-e89b-42d3-a456-426614174000')
        expect(result.replayed).toBe(true)
        expect(result.contribution.id).toBe('123e4567-e89b-42d3-a456-426614174002')
        expect(apiDataFetch).toHaveBeenCalledTimes(1)
    })
    it('propagates a backend balance conflict',async()=>{
        const error=Object.assign(new Error('Payment amount exceeds remaining balance.'),{
            statusCode:400,
            error:{
                message:'Payment amount exceeds remaining balance.',
            },
        })
        vi.mocked(apiDataFetch).mockRejectedValue(error)
        await expect(
            createManualContribution(contributionBody,'123e4567-e89b-42d3-a456-426614174000')
        ).rejects.toMatchObject({
            statusCode:400,
            error:{message:'Payment amount exceeds remaining balance.'},
        })
    })
})