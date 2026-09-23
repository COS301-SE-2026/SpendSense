import React from 'react'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {beforeEach,describe,expect,it,vi} from 'vitest'
import '@testing-library/jest-dom'
import PaymentOccurrenceBalance from '../components/payments/PaymentOccurrenceBalance'
import {getReceiptOccurrenceBalance,type ReceiptOccurrence} from '../features/receipts/receiptOccurrencesApi'

vi.mock('../features/receipts/receiptOccurrencesApi',()=>({
    getReceiptOccurrenceBalance:vi.fn(),
}))

const electricity:ReceiptOccurrence={
    id:'occ_electricity',
    obligationId:'obl_electricity',
    obligationName:'Electricity',
    dueDate:'2026-09-30',
    currency:'ZAR',
    amountDue:'300.00',
    amountPaid:'100.00',
    amountRemaining:'200.00',
    status:'PARTIALLY_PAID',
    canRecord:true,
}

describe('PaymentOccurrenceBalance',()=>{
    beforeEach(()=>{
        vi.clearAllMocks()
        vi.mocked(getReceiptOccurrenceBalance).mockResolvedValue({occurrence:electricity})
    })
    it('fetches the selected occurrence balance',async()=>{
        render(<PaymentOccurrenceBalance occurrenceId="occ_electricity"/>)
        expect(await screen.findByRole('heading',{name:'Electricity'})).toBeInTheDocument()
        expect(getReceiptOccurrenceBalance).toHaveBeenCalledWith('occ_electricity')
    })
    it('displays the amount due, already paid and remaining balance',async()=>{
        render(<PaymentOccurrenceBalance occurrenceId="occ_electricity"/>)
        expect(await screen.findByText('R 300.00')).toBeInTheDocument()
        expect(screen.getByText('R 100.00')).toBeInTheDocument()
        expect(screen.getByText('R 200.00')).toBeInTheDocument()
    })
    it('displays the current occurrence status',async()=>{
        render(<PaymentOccurrenceBalance occurrenceId="occ_electricity"/>)
        expect(await screen.findByText('PARTIALLY PAID')).toBeInTheDocument()
    })
    it('shows a loading state while fetching the balance',()=>{
        vi.mocked(getReceiptOccurrenceBalance).mockReturnValue(new Promise(()=>{}))
        render(<PaymentOccurrenceBalance occurrenceId="occ_electricity"/>)
        expect(screen.getByRole('status')).toHaveTextContent('Loading current payment balance...')
    })
    it('shows an error when the balance cannot be loaded',async()=>{
        vi.mocked(getReceiptOccurrenceBalance).mockRejectedValue(new Error('Network error'))
        render(<PaymentOccurrenceBalance occurrenceId="occ_electricity"/>)
        expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load the current payment balance.')
    })
    it('retries when refreshing after a failed request',async()=>{
        vi.mocked(getReceiptOccurrenceBalance)
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce({occurrence:electricity})
        render(<PaymentOccurrenceBalance occurrenceId="occ_electricity"/>)
        expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load the current payment balance.')
        fireEvent.click(screen.getByRole('button',{name:'Refresh payment balance'}))
        expect(await screen.findByText('R 200.00')).toBeInTheDocument()
        expect(getReceiptOccurrenceBalance).toHaveBeenCalledTimes(2)
    })
    it('fetches a new balance when the selected occurrence changes',async()=>{
        const netflix:ReceiptOccurrence={
            ...electricity,
            id:'occ_netflix',
            obligationName:'Netflix',
            amountDue:'199.00',
            amountPaid:'0.00',
            amountRemaining:'199.00',
            status:'PENDING',
        }
        vi.mocked(getReceiptOccurrenceBalance)
            .mockResolvedValueOnce({occurrence:electricity})
            .mockResolvedValueOnce({occurrence:netflix})
        const view=render(<PaymentOccurrenceBalance key="occ_electricity" occurrenceId="occ_electricity"/>)
        expect(await screen.findByText('R 200.00')).toBeInTheDocument()
        view.rerender(<PaymentOccurrenceBalance key="occ_netflix" occurrenceId="occ_netflix"/>)
        expect(await screen.findByRole('heading',{name:'Netflix'})).toBeInTheDocument()
        expect(screen.getAllByText('R 199.00')).toHaveLength(2)
        expect(getReceiptOccurrenceBalance).toHaveBeenCalledWith('occ_netflix')
    })
    it('warns when an occurrence can no longer accept contributions',async()=>{
        vi.mocked(getReceiptOccurrenceBalance).mockResolvedValue({
            occurrence:{
                ...electricity,
                amountPaid:'300.00',
                amountRemaining:'0.00',
                status:'PAID',
                canRecord:false,
            },
        })
        render(<PaymentOccurrenceBalance occurrenceId="occ_electricity"/>)
        expect(await screen.findByRole('alert')).toHaveTextContent('This payment can no longer accept contributions.')
    })
    it('refreshes the balance after another contribution',async()=>{
        const updated={
            ...electricity,
            amountPaid:'150.00',
            amountRemaining:'150.00',
        }
        vi.mocked(getReceiptOccurrenceBalance)
            .mockResolvedValueOnce({occurrence:electricity})
            .mockResolvedValueOnce({occurrence:updated})
        render(<PaymentOccurrenceBalance occurrenceId="occ_electricity"/>)
        expect(await screen.findByText('R 200.00')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button',{name:'Refresh payment balance'}))
        await waitFor(()=>{
            expect(screen.getAllByText('R 150.00')).toHaveLength(2)
        })
        expect(getReceiptOccurrenceBalance).toHaveBeenCalledTimes(2)
    })
})