
import React from 'react'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {beforeEach,describe,expect,it,vi} from 'vitest'
import '@testing-library/jest-dom'
import ReceiptOccurrencePicker from '../components/receipts/ReceiptOccurencePicker'
import {getEligibleReceiptOccurrences,getReceiptOccurrenceBalance,type ReceiptOccurrence} from '../features/receipts/receiptOccurrencesApi'

vi.mock('../features/receipts/receiptOccurrencesApi',()=>({
    getEligibleReceiptOccurrences:vi.fn(),
    getReceiptOccurrenceBalance:vi.fn(),
}))

const onSelect=vi.fn()

const electricity:ReceiptOccurrence={
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
}

const netflix:ReceiptOccurrence={
    id:'occ_456',
    obligationId:'obl_789',
    obligationName:'Netflix',
    dueDate:'2026-09-25',
    currency:'ZAR',
    amountDue:'199.00',
    amountPaid:'0.00',
    amountRemaining:'199.00',
    status:'PENDING',
    canRecord:true,
}

function renderPicker(selectedOccurrence:ReceiptOccurrence|null=null,preselectedOccurrenceId?:string){
    return render(
        <ReceiptOccurrencePicker
            selectedOccurrence={selectedOccurrence}
            preselectedOccurrenceId={preselectedOccurrenceId}
            onSelect={onSelect}
        />
    )
}

describe('ReceiptOccurrencePicker',()=>{
    beforeEach(()=>{
        vi.clearAllMocks()
        vi.mocked(getEligibleReceiptOccurrences).mockResolvedValue({
            items:[electricity,netflix],
            nextCursor:null,
        })
        vi.mocked(getReceiptOccurrenceBalance).mockResolvedValue({
            occurrence:electricity,
        })
    })
    it('renders the occurrence picker',()=>{
        renderPicker()
        expect(screen.getByRole('heading',{name:'Choose a payment'})).toBeInTheDocument()
        expect(screen.getByRole('button',{name:'Select payment occurrence'})).toBeInTheDocument()
    })
    it('loads eligible payment occurrences',async()=>{
        renderPicker()
        fireEvent.click(screen.getByRole('button',{name:'Select payment occurrence'}))
        expect(await screen.findByRole('button',{name:'Select Electricity due 2026-09-30'})).toBeInTheDocument()
        expect(screen.getByRole('button',{name:'Select Netflix due 2026-09-25'})).toBeInTheDocument()
        expect(getEligibleReceiptOccurrences).toHaveBeenCalledWith()
    })
    it('fetches the current balance after selecting an occurrence',async()=>{
        renderPicker()
        fireEvent.click(screen.getByRole('button',{name:'Select payment occurrence'}))
        fireEvent.click(await screen.findByRole('button',{name:'Select Electricity due 2026-09-30'}))
        await waitFor(()=>{
            expect(getReceiptOccurrenceBalance).toHaveBeenCalledWith('occ_123')
            expect(onSelect).toHaveBeenCalledWith(electricity)
        })
    })
    it('shows the selected occurrence and its remaining balance',()=>{
        renderPicker(electricity)
        expect(screen.getByRole('heading',{name:'Electricity'})).toBeInTheDocument()
        expect(screen.getByText('ZAR 300.00')).toBeInTheDocument()
        expect(screen.getByText('ZAR 100.00')).toBeInTheDocument()
        expect(screen.getByText('ZAR 200.00')).toBeInTheDocument()
    })
    it('loads the preselected occurrence balance',async()=>{
        renderPicker(null,'occ_123')
        await waitFor(()=>{
            expect(getReceiptOccurrenceBalance).toHaveBeenCalledWith('occ_123')
            expect(onSelect).toHaveBeenCalledWith(electricity)
        })
    })
    it('shows a warning when the preselected occurrence cannot be loaded',async()=>{
        vi.mocked(getReceiptOccurrenceBalance).mockRejectedValue(new Error('Not found'))
        renderPicker(null,'occ_123')
        expect(await screen.findByRole('alert')).toHaveTextContent('The preselected payment could not be loaded.')
        expect(onSelect).toHaveBeenCalledWith(null)
    })
    it('refreshes the selected occurrence balance',async()=>{
        const updated={...electricity,amountPaid:'150.00',amountRemaining:'150.00'}
        vi.mocked(getReceiptOccurrenceBalance).mockResolvedValue({occurrence:updated})
        renderPicker(electricity)
        fireEvent.click(screen.getByRole('button',{name:'Refresh occurrence balance'}))
        await waitFor(()=>{
            expect(getReceiptOccurrenceBalance).toHaveBeenCalledWith('occ_123')
            expect(onSelect).toHaveBeenCalledWith(updated)
        })
    })
    it('shows a warning when the occurrence cannot accept payments',()=>{
        renderPicker({...electricity,status:'PAID',amountRemaining:'0.00',canRecord:false})
        expect(screen.getByRole('alert')).toHaveTextContent('This payment can no longer accept contributions.')
    })
    it('shows the empty state when no occurrences are available',async()=>{
        vi.mocked(getEligibleReceiptOccurrences).mockResolvedValue({
            items:[],
            nextCursor:null,
        })
        renderPicker()
        fireEvent.click(screen.getByRole('button',{name:'Select payment occurrence'}))
        expect(await screen.findByText('No eligible payments are available.')).toBeInTheDocument()
    })
    it('retries when eligible occurrences fail to load',async()=>{
        vi.mocked(getEligibleReceiptOccurrences)
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce({items:[electricity],nextCursor:null})
        renderPicker()
        fireEvent.click(screen.getByRole('button',{name:'Select payment occurrence'}))
        expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load available payments.')
        fireEvent.click(screen.getByRole('button',{name:'Retry payments'}))
        expect(await screen.findByRole('button',{name:'Select Electricity due 2026-09-30'})).toBeInTheDocument()
    })
    it('loads another page of occurrences',async()=>{
        vi.mocked(getEligibleReceiptOccurrences)
            .mockResolvedValueOnce({items:[electricity],nextCursor:'page_2'})
            .mockResolvedValueOnce({items:[netflix],nextCursor:null})
        renderPicker()
        fireEvent.click(screen.getByRole('button',{name:'Select payment occurrence'}))
        fireEvent.click(await screen.findByRole('button',{name:'Load more payments'}))
        expect(await screen.findByRole('button',{name:'Select Netflix due 2026-09-25'})).toBeInTheDocument()
        expect(getEligibleReceiptOccurrences).toHaveBeenCalledWith('page_2')
    })
    it('does not record a payment when selecting an occurrence',async()=>{
        renderPicker()
        fireEvent.click(screen.getByRole('button',{name:'Select payment occurrence'}))
        fireEvent.click(await screen.findByRole('button',{name:'Select Electricity due 2026-09-30'}))
        await waitFor(()=>expect(onSelect).toHaveBeenCalledWith(electricity))
        expect(screen.queryByRole('button',{name:'Confirm payment'})).not.toBeInTheDocument()
    })
})