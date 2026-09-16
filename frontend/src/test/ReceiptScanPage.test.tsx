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
    it('shows the supported image formats',()=>{
        render(
            <MemoryRouter>
                <ReceiptScanPage/>
            </MemoryRouter>
        )
        expect(screen.getByText(/JPEG and PNG images are supported/i)).toBeInTheDocument()
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
    it('explains that the receipt is previewed before processing',()=>{
        render(
            <MemoryRouter>
                <ReceiptScanPage/>
            </MemoryRouter>
        )
        expect(screen.getByText(/You will preview the receipt first/i)).toBeInTheDocument()
    })
})