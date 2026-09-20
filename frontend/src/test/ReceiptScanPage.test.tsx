
import React from 'react'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {describe,it,expect,vi,beforeEach} from 'vitest'
import '@testing-library/jest-dom'
import ReceiptScanPage from '../domains/ReceiptScanPage'
import {scanReceipt} from '../features/receipts/receiptsApi'

const navigate=vi.fn()

vi.mock('react-router-dom',async()=>{
    const actual=await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
    return{
        ...actual,
        useNavigate:()=>navigate,
    }
})

vi.mock('../features/receipts/receiptsApi',()=>({
    scanReceipt:vi.fn(),
}))

const scanResponse={
    id:'scan_abc',
    status:'READY_FOR_REVIEW' as const,
    expiresAt:'2026-09-21T12:00:00.000Z',
    extraction:{
        amountCandidates:[],
        merchant:null,
        receiptDate:null,
        warnings:[],
    },
    preselectedOccurrenceId:null,
}

describe('ReceiptScanPage',()=>{
    beforeEach(()=>{
        vi.clearAllMocks()
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
        expect(screen.getByRole('button',{name:'Scan receipt'})).toBeInTheDocument()
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
        expect(screen.queryByRole('button',{name:'Scan receipt'})).not.toBeInTheDocument()
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
    it('submits the selected image to the scan API',async()=>{
        vi.mocked(scanReceipt).mockResolvedValue(scanResponse)
        render(
            <MemoryRouter>
                <ReceiptScanPage/>
            </MemoryRouter>
        )
        const file=new File(['receipt'],'receipt.jpg',{type:'image/jpeg'})
        fireEvent.change(screen.getByLabelText('Upload receipt image'),{target:{files:[file]}})
        fireEvent.click(screen.getByRole('button',{name:'Scan receipt'}))
        await waitFor(()=>{
            expect(scanReceipt).toHaveBeenCalledWith(file,undefined)
        })
        expect(await screen.findByText('Receipt scanned. Ready for review.')).toBeInTheDocument()
    })
    it('passes the occurrence ID from the URL to the scan API',async()=>{
        vi.mocked(scanReceipt).mockResolvedValue(scanResponse)
        render(
            <MemoryRouter initialEntries={['/receipts/new?occurrenceId=occ_123']}>
                <ReceiptScanPage/>
            </MemoryRouter>
        )
        const file=new File(['receipt'],'receipt.png',{type:'image/png'})
        fireEvent.change(screen.getByLabelText('Upload receipt image'),{target:{files:[file]}})
        fireEvent.click(screen.getByRole('button',{name:'Scan receipt'}))
        await waitFor(()=>{
            expect(scanReceipt).toHaveBeenCalledWith(file,'occ_123')
        })
    })
    it('shows the OCR processing state and disables image controls',()=>{
        vi.mocked(scanReceipt).mockImplementation(()=>new Promise(()=>{}))
        render(
            <MemoryRouter>
                <ReceiptScanPage/>
            </MemoryRouter>
        )
        const file=new File(['receipt'],'receipt.jpg',{type:'image/jpeg'})
        fireEvent.change(screen.getByLabelText('Upload receipt image'),{target:{files:[file]}})
        fireEvent.click(screen.getByRole('button',{name:'Scan receipt'}))
        expect(screen.getByRole('status')).toHaveTextContent('Reading your receipt...')
        expect(screen.getByRole('button',{name:'Retake photo'})).toBeDisabled()
        expect(screen.getByRole('button',{name:'Replace image'})).toBeDisabled()
        expect(screen.getByRole('button',{name:'Remove image'})).toBeDisabled()
    })
    it('shows a message when the scan request fails',async()=>{
        vi.mocked(scanReceipt).mockRejectedValue(new Error('OCR unavailable'))
        render(
            <MemoryRouter>
                <ReceiptScanPage/>
            </MemoryRouter>
        )
        const file=new File(['receipt'],'receipt.jpg',{type:'image/jpeg'})
        fireEvent.change(screen.getByLabelText('Upload receipt image'),{target:{files:[file]}})
        fireEvent.click(screen.getByRole('button',{name:'Scan receipt'}))
        expect(await screen.findByRole('alert')).toHaveTextContent('Unable to scan receipt. Please try again.')
        expect(screen.queryByText('Receipt scanned. Ready for review.')).not.toBeInTheDocument()
    })
})