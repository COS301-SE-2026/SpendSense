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
    receiptDate:'2026-09-20',
}

const confirmation={
    replayed:false,
    contribution:{
        id:'pc_789',
        occurrenceId:'occ_123',
        amount:'100.00',
        currency:'ZAR',
        paidDate:'2026-09-20',
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
                    paidDate:'2026-09-20',
                    acknowledged:true,
                },
                '123e4567-e89b-42d3-a456-426614174000',
            )
        })
    })
    it('refreshes the balance before submitting the first confirmation',async()=>{
        renderPanel()
        acknowledge()
        fireEvent.click(screen.getByRole('button',{name:'Confirm payment'}))
        await waitFor(()=>{
            expect(getReceiptOccurrenceBalance).toHaveBeenCalledWith('occ_123')
            expect(confirmReceiptPayment).toHaveBeenCalledTimes(1)
        })
    })
    it('prevents confirming an amount greater than the remaining balance',()=>{
        renderPanel({...values,amount:'350.00'})
        acknowledge()
        expect(screen.getByRole('button',{name:'Confirm payment'})).toBeDisabled()
        expect(confirmReceiptPayment).not.toHaveBeenCalled()
    })
    it('prevents confirming with a different currency',()=>{
        renderPanel({...values,currency:'USD'})
        acknowledge()
        expect(screen.getByRole('button',{name:'Confirm payment'})).toBeDisabled()
    })
    it('prevents confirming without a payment occurrence',()=>{
        renderPanel(values,null)
        acknowledge()
        expect(screen.getByRole('button',{name:'Confirm payment'})).toBeDisabled()
    })
    it('requires a valid payment date',()=>{
        renderPanel({...values,receiptDate:''})
        acknowledge()
        expect(screen.getByRole('button',{name:'Confirm payment'})).toBeDisabled()
    })
    it('stops confirmation when the balance changed before submission',async()=>{
        vi.mocked(getReceiptOccurrenceBalance).mockResolvedValue({
            occurrence:{...occurrence,amountRemaining:'200.00',amountPaid:'100.00'},
        })
        renderPanel()
        acknowledge()
        fireEvent.click(screen.getByRole('button',{name:'Confirm payment'}))
        expect(await screen.findByRole('alert')).toHaveTextContent('The payment balance has changed.')
        expect(confirmReceiptPayment).not.toHaveBeenCalled()
        expect(onOccurrenceChange).toHaveBeenCalledWith({
            ...occurrence,
            amountRemaining:'200.00',
            amountPaid:'100.00',
        })
    })
    it('shows the actual result returned by the backend',async()=>{
        renderPanel()
        acknowledge()
        fireEvent.click(screen.getByRole('button',{name:'Confirm payment'}))
        expect(await screen.findByRole('heading',{name:'Payment recorded'})).toBeInTheDocument()
        expect(screen.getByText('ZAR 200.00')).toBeInTheDocument()
        expect(screen.getByText('pc_789',{exact:false})).toBeInTheDocument()
        expect(onOccurrenceChange).toHaveBeenCalledWith(confirmation.occurrence)
    })
    it('does not send a second confirmation after success',async()=>{
        renderPanel()
        acknowledge()
        fireEvent.click(screen.getByRole('button',{name:'Confirm payment'}))
        expect(await screen.findByRole('heading',{name:'Payment recorded'})).toBeInTheDocument()
        expect(confirmReceiptPayment).toHaveBeenCalledTimes(1)
        expect(screen.queryByRole('button',{name:'Confirm payment'})).not.toBeInTheDocument()
    })
    it('reuses the same idempotency key when retrying an uncertain result',async()=>{
        vi.mocked(confirmReceiptPayment)
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce(confirmation)
        renderPanel()
        acknowledge()
        fireEvent.click(screen.getByRole('button',{name:'Confirm payment'}))
        expect(await screen.findByRole('alert')).toHaveTextContent('We could not confirm whether the payment was recorded.')
        fireEvent.click(screen.getByRole('button',{name:'Confirm payment'}))
        expect(await screen.findByRole('heading',{name:'Payment recorded'})).toBeInTheDocument()
        expect(confirmReceiptPayment).toHaveBeenCalledTimes(2)
        expect(vi.mocked(confirmReceiptPayment).mock.calls[0][2]).toBe(
            vi.mocked(confirmReceiptPayment).mock.calls[1][2]
        )
    })
})