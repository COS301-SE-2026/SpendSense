
import React from 'react'
import {fireEvent,render,screen} from '@testing-library/react'
import {describe,expect,it} from 'vitest'
import '@testing-library/jest-dom'
import ReceiptExtractionForm from '../components/receipts/ReceiptExtractionForm'
import type {ReceiptExtraction} from '../features/receipts/receiptsApi'

const extraction:ReceiptExtraction={
    amountCandidates:[
        {value:'100.00',currency:'ZAR',confidence:'HIGH',label:'total'},
        {value:'86.96',currency:'ZAR',confidence:'MEDIUM',label:'subtotal'},
        {value:'120.00',currency:'USD',confidence:'LOW',label:'other'},
    ],
    merchant:{value:'City Power',confidence:'MEDIUM'},
    receiptDate:{value:'2026-09-20',confidence:'HIGH'},
    warnings:['Multiple possible totals were found.','Please check the receipt date.'],
}

describe('ReceiptExtractionForm',()=>{    it('displays all amount candidates and their confidence values',()=>{
        render(<ReceiptExtractionForm extraction={extraction}/>)
        expect(screen.getByRole('button',{name:'Use total ZAR 100.00'})).toBeInTheDocument()
        expect(screen.getByRole('button',{name:'Use subtotal ZAR 86.96'})).toBeInTheDocument()
        expect(screen.getByRole('button',{name:'Use other USD 120.00'})).toBeInTheDocument()
        expect(screen.getAllByText('HIGH confidence').length).toBeGreaterThan(0)
        expect(screen.getAllByText('MEDIUM confidence').length).toBeGreaterThan(0)
        expect(screen.getAllByText('LOW confidence').length).toBeGreaterThan(0)
    })
    it('prefills the editable fields from the extraction',()=>{
        render(<ReceiptExtractionForm extraction={extraction}/>)
        expect(screen.getByLabelText('Amount paid')).toHaveValue('100.00')
        expect(screen.getByLabelText('Currency')).toHaveValue('ZAR')
        expect(screen.getByLabelText('Merchant')).toHaveValue('City Power')
        expect(screen.getByLabelText('Receipt date')).toHaveValue('2026-09-20')
    })
    it('selects an amount candidate and its corresponding currency',()=>{
        render(<ReceiptExtractionForm extraction={extraction}/>)
        fireEvent.click(screen.getByRole('button',{name:'Use other USD 120.00'}))
        expect(screen.getByLabelText('Amount paid')).toHaveValue('120.00')
        expect(screen.getByLabelText('Currency')).toHaveValue('USD')
        expect(screen.getByRole('button',{name:'Use other USD 120.00'})).toHaveAttribute('aria-pressed','true')
        expect(screen.getByRole('button',{name:'Use total ZAR 100.00'})).toHaveAttribute('aria-pressed','false')
    })
    it('allows the amount and currency to be changed manually',()=>{
        render(<ReceiptExtractionForm extraction={extraction}/>)
        fireEvent.change(screen.getByLabelText('Amount paid'),{target:{value:'95.50'}})
        fireEvent.change(screen.getByLabelText('Currency'),{target:{value:'usd'}})
        expect(screen.getByLabelText('Amount paid')).toHaveValue('95.50')
        expect(screen.getByLabelText('Currency')).toHaveValue('USD')
        expect(screen.getByRole('button',{name:'Use total ZAR 100.00'})).toHaveAttribute('aria-pressed','false')
    })
    it('allows merchant and receipt date to be corrected',()=>{
        render(<ReceiptExtractionForm extraction={extraction}/>)
        fireEvent.change(screen.getByLabelText('Merchant'),{target:{value:'Checkers'}})
        fireEvent.change(screen.getByLabelText('Receipt date'),{target:{value:'2026-09-19'}})
        expect(screen.getByLabelText('Merchant')).toHaveValue('Checkers')
        expect(screen.getByLabelText('Receipt date')).toHaveValue('2026-09-19')
    })
    it('clears every extracted field independently',()=>{
        render(<ReceiptExtractionForm extraction={extraction}/>)
        fireEvent.click(screen.getByRole('button',{name:'Clear amount'}))
        fireEvent.click(screen.getByRole('button',{name:'Clear currency'}))
        fireEvent.click(screen.getByRole('button',{name:'Clear merchant'}))
        fireEvent.click(screen.getByRole('button',{name:'Clear receipt date'}))
        expect(screen.getByLabelText('Amount paid')).toHaveValue('')
        expect(screen.getByLabelText('Currency')).toHaveValue('')
        expect(screen.getByLabelText('Merchant')).toHaveValue('')
        expect(screen.getByLabelText('Receipt date')).toHaveValue('')
    })
    it('shows extraction warnings',()=>{
        render(<ReceiptExtractionForm extraction={extraction}/>)
        expect(screen.getByText('Things to double-check')).toBeInTheDocument()
        expect(screen.getByText('Multiple possible totals were found.')).toBeInTheDocument()
        expect(screen.getByText('Please check the receipt date.')).toBeInTheDocument()
    })    
    it('supports manual entry when no values were extracted',()=>{
        render(
            <ReceiptExtractionForm extraction={{
                amountCandidates:[],
                merchant:null,
                receiptDate:null,
                warnings:[],
            }}/>
        )
        expect(screen.getByText('No amount was found. Enter the payment amount and currency manually.')).toBeInTheDocument()
        expect(screen.getByLabelText('Amount paid')).toHaveValue('')
        expect(screen.getByLabelText('Currency')).toHaveValue('')
        expect(screen.getByLabelText('Merchant')).toHaveValue('')
        expect(screen.getByLabelText('Receipt date')).toHaveValue('')
        fireEvent.change(screen.getByLabelText('Amount paid'),{target:{value:'250.00'}})
        fireEvent.change(screen.getByLabelText('Currency'),{target:{value:'ZAR'}})
        expect(screen.getByLabelText('Amount paid')).toHaveValue('250.00')
        expect(screen.getByLabelText('Currency')).toHaveValue('ZAR')
    })
    it('does not offer payment confirmation at the extraction stage',()=>{
        render(<ReceiptExtractionForm extraction={extraction}/>)
        expect(screen.queryByRole('button',{name:'Confirm payment'})).not.toBeInTheDocument()
    })
})