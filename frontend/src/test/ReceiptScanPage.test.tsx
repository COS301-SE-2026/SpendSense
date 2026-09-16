import React from 'react'
import {fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {describe,it,expect,vi,beforeEach} from 'vitest'
import '@testing-library/jest-dom'
import ReceiptScanPage from '../domains/ReceiptScanPage'

const navigate=vi.fn()

vi.mock('react-router-dom',async()=>{
    const actual=await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
    return{
        ...actual,
        useNavigate:()=>navigate,
    }
})

describe('ReceiptScanPage',()=>{
    beforeEach(()=>{
        navigate.mockClear()
        vi.stubGlobal('URL',{
            createObjectURL:vi.fn(()=>'blob:receipt-preview'),
            revokeObjectURL:vi.fn(),
        })
    })
    it('renders the receipt scan page',()=>{
        render(
            <MemoryRouter>
                <ReceiptScanPage/>
            </MemoryRouter>
        )
        expect(screen.getByRole('heading',{name:'Scan your receipt'})).toBeInTheDocument()
        expect(screen.getByText('Add a receipt')).toBeInTheDocument()
    })
    it('shows camera and upload options',()=>{
        render(
            <MemoryRouter>
                <ReceiptScanPage/>
            </MemoryRouter>
        )
        expect(screen.getByRole('button',{name:'Take photo'})).toBeInTheDocument()
        expect(screen.getByRole('button',{name:'Upload image'})).toBeInTheDocument()
    })
    it('shows a preview after selecting a jpeg',()=>{
        render(
            <MemoryRouter>
                <ReceiptScanPage/>
            </MemoryRouter>
        )
        const file=new File(['receipt'],'receipt.jpg',{type:'image/jpeg'})
        fireEvent.change(screen.getByLabelText('Upload receipt image'),{target:{files:[file]}})
        expect(screen.getByAltText('Receipt preview')).toBeInTheDocument()
        expect(screen.getByRole('button',{name:'Replace image'})).toBeInTheDocument()
        expect(screen.getByRole('button',{name:'Remove image'})).toBeInTheDocument()
    })
    it('shows a preview after selecting a png',()=>{
        render(
            <MemoryRouter>
                <ReceiptScanPage/>
            </MemoryRouter>
        )
        const file=new File(['receipt'],'receipt.png',{type:'image/png'})
        fireEvent.change(screen.getByLabelText('Upload receipt image'),{target:{files:[file]}})
        expect(screen.getByAltText('Receipt preview')).toBeInTheDocument()
    })
    it('rejects unsupported image formats',()=>{
        render(
            <MemoryRouter>
                <ReceiptScanPage/>
            </MemoryRouter>
        )
        const file=new File(['receipt'],'receipt.gif',{type:'image/gif'})
        fireEvent.change(screen.getByLabelText('Upload receipt image'),{target:{files:[file]}})
        expect(screen.getByRole('alert')).toHaveTextContent('Please choose a JPEG or PNG image.')
        expect(screen.queryByAltText('Receipt preview')).not.toBeInTheDocument()
    })
    it('removes a selected image',()=>{
        render(
            <MemoryRouter>
                <ReceiptScanPage/>
            </MemoryRouter>
        )
        const file=new File(['receipt'],'receipt.jpg',{type:'image/jpeg'})
        fireEvent.change(screen.getByLabelText('Upload receipt image'),{target:{files:[file]}})
        fireEvent.click(screen.getByRole('button',{name:'Remove image'}))
        expect(screen.queryByAltText('Receipt preview')).not.toBeInTheDocument()
        expect(screen.getByRole('button',{name:'Upload image'})).toBeInTheDocument()
    })
    it('navigates back when the back button is selected',()=>{
        render(
            <MemoryRouter>
                <ReceiptScanPage/>
            </MemoryRouter>
        )
        fireEvent.click(screen.getByRole('button',{name:'Go back'}))
        expect(navigate).toHaveBeenCalledWith(-1)
    })
})