import React from 'react'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {beforeEach,describe,expect,it,vi} from 'vitest'
import '@testing-library/jest-dom'
import ReceiptConfirmationPanel from '../components/receipts/ReceiptConfirmationPanel'
import {confirmReceiptPayment} from '../features/receipts/receiptsApi'
import {getReceiptOccurrenceBalance,type ReceiptOccurrence} from '../features/receipts/receiptOccurrencesApi'

vi.mock('../features/receipts/receiptsApi',()=>({
    confirmReceiptPayment:vi.fn(),
}))

vi.mock('../features/receipts/receiptOccurrencesApi',()=>({
    getReceiptOccurrenceBalance:vi.fn(),
}))

const occurrence:ReceiptOccurrence={
    id:'occ_123',
    obligationId:'obl_456',
    obligationName:'Electricity',
    dueDate:'2026-09-30',
    currency:'ZAR',
    amountDue:'300.00',
    amountPaid:'0.00',
    amountRemaining:'300.00',
    status:'PENDING',
    canRecord:true,
}

const values={
    amount:'100.00',
    currency:'ZAR',
    merchant:'City Power',
    receiptDate:'2026-09-10',
}

const confirmation={
    replayed:false,
    contribution:{
        id:'pc_789',
        occurrenceId:'occ_123',
        amount:'100.00',
        currency:'ZAR',
        paidDate:'2026-09-10',
        source:'RECEIPT_SCAN' as const,
        state:'POSTED' as const,
        receiptScanId:'scan_abc',
        createdAt:'2026-09-20T12:00:00.000Z',
    },
    occurrence:{
        ...occurrence,
        obligationId:'obl_456',
        amountPaid:'100.00',
        amountRemaining:'200.00',
        status:'PARTIALLY_PAID' as const,
        canRecord:true,
    },
    settlement:null,
    scoreImpact:null,
    rewards:null,
}

const onOccurrenceChange=vi.fn()
const onConfirmed=vi.fn()

function renderPanel(
    paymentValues=values,
    selectedOccurrence:ReceiptOccurrence|null=occurrence,
){
    return render(
        <ReceiptConfirmationPanel
            scanId="scan_abc"
            values={paymentValues}
            occurrence={selectedOccurrence}
            onOccurrenceChange={onOccurrenceChange}
            onConfirmed={onConfirmed}
        />
    )
}

function acknowledge(){
    fireEvent.click(screen.getByRole('checkbox',{
        name:'I confirm that I made this payment and have checked the receipt details.',
    }))
}

describe('ReceiptConfirmationPanel',()=>{
    beforeEach(()=>{
        vi.clearAllMocks()
        vi.stubGlobal('crypto',{randomUUID:vi.fn(()=>'123e4567-e89b-42d3-a456-426614174000')})
        vi.mocked(getReceiptOccurrenceBalance).mockResolvedValue({occurrence})
        vi.mocked(confirmReceiptPayment).mockResolvedValue(confirmation)
    })
    it('shows the expected balance for a partial payment',()=>{
        renderPanel()
        expect(screen.getByText('ZAR 300.00')).toBeInTheDocument()
        expect(screen.getByText('ZAR 100.00')).toBeInTheDocument()
        expect(screen.getByText('ZAR 200.00')).toBeInTheDocument()
    })
    it('requires acknowledgement before confirmation',()=>{
        renderPanel()
        expect(screen.getByRole('button',{name:'Confirm payment'})).toBeDisabled()
        acknowledge()
        expect(screen.getByRole('button',{name:'Confirm payment'})).toBeEnabled()
    })
    it('uses the edited payment amount and a UUID idempotency key',async()=>{
        renderPanel({...values,amount:'95.50'})
        acknowledge()
        fireEvent.click(screen.getByRole('button',{name:'Confirm payment'}))
        await waitFor(()=>{
            expect(confirmReceiptPayment).toHaveBeenCalledWith(
                'scan_abc',
                {
                    occurrenceId:'occ_123',
                    amount:'95.50',
                    currency:'ZAR',
                    paidDate:'2026-09-10',
                    acknowledged:true,
                },
                '123e4567-e89b-42d3-a456-426614174000',
            )
        })
    })
    it('refreshes the balance before the first confirmation request',async()=>{
        renderPanel()
        acknowledge()
        fireEvent.click(screen.getByRole('button',{name:'Confirm payment'}))
        await waitFor(()=>{
            expect(getReceiptOccurrenceBalance).toHaveBeenCalledWith('occ_123')
            expect(confirmReceiptPayment).toHaveBeenCalledTimes(1)
        })
    })
    it('prevents confirming more than the remaining balance',()=>{
        renderPanel({...values,amount:'350.00'})
        acknowledge()
        expect(screen.getByRole('button',{name:'Confirm payment'})).toBeDisabled()
        expect(confirmReceiptPayment).not.toHaveBeenCalled()
    })
    it('prevents confirming a different currency',()=>{
        renderPanel({...values,currency:'USD'})
        acknowledge()
        expect(screen.getByRole('button',{name:'Confirm payment'})).toBeDisabled()
    })
    it('prevents confirming without an occurrence',()=>{
        renderPanel(values,null)
        acknowledge()
        expect(screen.getByRole('button',{name:'Confirm payment'})).toBeDisabled()
    })
    it('requires a valid payment date',()=>{
        renderPanel({...values,receiptDate:''})
        acknowledge()
        expect(screen.getByRole('button',{name:'Confirm payment'})).toBeDisabled()
    })
    it('stops confirmation if the balance changed before submission',async()=>{
        const updated={
            ...occurrence,
            amountRemaining:'200.00',
            amountPaid:'100.00',
        }
        vi.mocked(getReceiptOccurrenceBalance).mockResolvedValue({occurrence:updated})
        renderPanel()
        acknowledge()
        fireEvent.click(screen.getByRole('button',{name:'Confirm payment'}))
        expect(await screen.findByRole('alert')).toHaveTextContent('The payment balance has changed.')
        expect(confirmReceiptPayment).not.toHaveBeenCalled()
        expect(onOccurrenceChange).toHaveBeenCalledWith(updated)
    })
    it('shows a distinct partial-payment success state',async()=>{
        renderPanel()
        acknowledge()
        fireEvent.click(screen.getByRole('button',{name:'Confirm payment'}))
        expect(await screen.findByRole('heading',{name:'Partially paid'})).toBeInTheDocument()
        expect(screen.getByText('ZAR 200.00')).toBeInTheDocument()
        expect(onOccurrenceChange).toHaveBeenCalledWith(confirmation.occurrence)
        expect(onConfirmed).toHaveBeenCalledWith(confirmation)
    })
    it('does not invent settlement rewards for a partial payment',async()=>{
        renderPanel()
        acknowledge()
        fireEvent.click(screen.getByRole('button',{name:'Confirm payment'}))
        expect(await screen.findByRole('heading',{name:'Partially paid'})).toBeInTheDocument()
        expect(screen.queryByText('Credit score impact')).not.toBeInTheDocument()
        expect(screen.queryByText('Your rewards')).not.toBeInTheDocument()
    })
    it('shows a distinct completed-payment state',async()=>{
        const fullConfirmation={
            ...confirmation,
            occurrence:{
                ...confirmation.occurrence,
                amountPaid:'300.00',
                amountRemaining:'0.00',
                status:'PAID' as const,
                canRecord:false,
            },
        }
        vi.mocked(confirmReceiptPayment).mockResolvedValue(fullConfirmation)
        renderPanel()
        acknowledge()
        fireEvent.click(screen.getByRole('button',{name:'Confirm payment'}))
        expect(await screen.findByRole('heading',{name:'Payment complete!'})).toBeInTheDocument()
        expect(screen.getByText('ZAR 0.00')).toBeInTheDocument()
        expect(screen.getByText('ZAR 300.00')).toBeInTheDocument()
    })
    it('displays backend settlement and reward details after full payment',async()=>{
        const fullConfirmation={
            ...confirmation,
            occurrence:{
                ...confirmation.occurrence,
                amountPaid:'300.00',
                amountRemaining:'0.00',
                status:'PAID' as const,
                canRecord:false,
            },
            settlement:{isLate:false,daysLate:0},
            scoreImpact:{delta:15},
            rewards:{coinsAwarded:20,xpAwarded:10},
        }
        vi.mocked(confirmReceiptPayment).mockResolvedValue(fullConfirmation)
        renderPanel()
        acknowledge()
        fireEvent.click(screen.getByRole('button',{name:'Confirm payment'}))
        expect(await screen.findByRole('heading',{name:'Payment complete!'})).toBeInTheDocument()
        expect(screen.getByText('Credit score impact')).toBeInTheDocument()
        expect(screen.getByText('+15 points')).toBeInTheDocument()
        expect(screen.getByText('Your rewards')).toBeInTheDocument()
        expect(screen.getByText('Coins earned')).toBeInTheDocument()
        expect(screen.getByText('XP earned')).toBeInTheDocument()
        expect(screen.getByText('+20')).toBeInTheDocument()
        expect(screen.getByText('+10')).toBeInTheDocument()
    })
    it('does not send another confirmation after success',async()=>{
        renderPanel()
        acknowledge()
        fireEvent.click(screen.getByRole('button',{name:'Confirm payment'}))
        expect(await screen.findByRole('heading',{name:'Partially paid'})).toBeInTheDocument()
        expect(confirmReceiptPayment).toHaveBeenCalledTimes(1)
        expect(screen.queryByRole('button',{name:'Confirm payment'})).not.toBeInTheDocument()
    })
    it('reuses the same idempotency key for an uncertain retry',async()=>{
        vi.mocked(confirmReceiptPayment)
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce({...confirmation,replayed:true})
        renderPanel()
        acknowledge()
        fireEvent.click(screen.getByRole('button',{name:'Confirm payment'}))
        expect(await screen.findByRole('alert')).toHaveTextContent('We could not confirm whether the payment was recorded.')
        fireEvent.click(screen.getByRole('button',{name:'Confirm payment'}))
        expect(await screen.findByRole('heading',{name:'Partially paid'})).toBeInTheDocument()
        expect(confirmReceiptPayment).toHaveBeenCalledTimes(2)
        expect(vi.mocked(confirmReceiptPayment).mock.calls[0][2]).toBe(
            vi.mocked(confirmReceiptPayment).mock.calls[1][2]
        )
        expect(screen.getByText(/No second contribution was created/)).toBeInTheDocument()
    })
    it('does not retry an uncertain request with a changed amount',async()=>{
        vi.mocked(confirmReceiptPayment).mockRejectedValueOnce(new Error('Network error'))
        const view=renderPanel()
        acknowledge()
        fireEvent.click(screen.getByRole('button',{name:'Confirm payment'}))
        expect(await screen.findByRole('alert')).toHaveTextContent('We could not confirm whether the payment was recorded.')
        view.rerender(
            <ReceiptConfirmationPanel
                scanId="scan_abc"
                values={{...values,amount:'150.00'}}
                occurrence={occurrence}
                onOccurrenceChange={onOccurrenceChange}
                onConfirmed={onConfirmed}
            />
        )
        fireEvent.click(screen.getByRole('button',{name:'Confirm payment'}))
        expect(await screen.findByRole('alert')).toHaveTextContent('Restore the original payment details')
        expect(confirmReceiptPayment).toHaveBeenCalledTimes(1)
    })
    it('refreshes the balance after a backend conflict',async()=>{
        const updated={
            ...occurrence,
            amountPaid:'150.00',
            amountRemaining:'150.00',
        }
        vi.mocked(confirmReceiptPayment).mockRejectedValueOnce({
            statusCode:409,
            error:{code:'AMOUNT_EXCEEDS_REMAINING'},
        })
        vi.mocked(getReceiptOccurrenceBalance)
            .mockResolvedValueOnce({occurrence})
            .mockResolvedValueOnce({occurrence:updated})
        renderPanel()
        acknowledge()
        fireEvent.click(screen.getByRole('button',{name:'Confirm payment'}))
        expect(await screen.findByRole('alert')).toHaveTextContent('The payment details have changed.')
        await waitFor(()=>{
            expect(onOccurrenceChange).toHaveBeenCalledWith(updated)
        })
        expect(confirmReceiptPayment).toHaveBeenCalledTimes(1)
    })
    it('blocks another confirmation when the scan was already consumed',async()=>{
        vi.mocked(confirmReceiptPayment).mockRejectedValueOnce({
            statusCode:409,
            error:{code:'SCAN_ALREADY_CONSUMED'},
        })
        renderPanel()
        acknowledge()
        fireEvent.click(screen.getByRole('button',{name:'Confirm payment'}))
        expect(await screen.findByRole('alert')).toHaveTextContent('already been used for a payment')
        expect(screen.getByRole('button',{name:'Confirm payment'})).toBeDisabled()
        expect(confirmReceiptPayment).toHaveBeenCalledTimes(1)
    })
    it('blocks confirmation when the scan has expired',async()=>{
        vi.mocked(confirmReceiptPayment).mockRejectedValueOnce({
            statusCode:409,
            error:{code:'SCAN_EXPIRED'},
        })
        renderPanel()
        acknowledge()
        fireEvent.click(screen.getByRole('button',{name:'Confirm payment'}))
        expect(await screen.findByRole('alert')).toHaveTextContent('This receipt scan has expired.')
        expect(screen.getByRole('button',{name:'Confirm payment'})).toBeDisabled()
    })
})