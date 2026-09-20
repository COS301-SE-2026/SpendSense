
import React from 'react'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter,Route,Routes} from 'react-router-dom'
import {beforeEach,describe,expect,it,vi} from 'vitest'
import '@testing-library/jest-dom'
import ReceiptReviewPage from '../domains/ReceiptReviewPage'
import {getReceiptScan} from '../features/receipts/receiptsApi'

const navigate=vi.fn()

vi.mock('react-router-dom',async()=>{
    const actual=await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
    return{
        ...actual,
        useNavigate:()=>navigate,
    }
})

vi.mock('../features/receipts/receiptsApi',()=>({
    getReceiptScan:vi.fn(),
}))

const scanResponse={
    id:'scan_abc',
    status:'READY_FOR_REVIEW' as const,
    expiresAt:'2099-09-21T12:00:00.000Z',
    extraction:{
        amountCandidates:[
            {value:'100.00',currency:'ZAR',confidence:'HIGH' as const,label:'total'},
        ],
        merchant:{value:'City Power',confidence:'MEDIUM' as const},
        receiptDate:{value:'2026-09-20',confidence:'MEDIUM' as const},
        warnings:[],
    },
    preselectedOccurrenceId:'occ_123',
}

function renderReview(state?:unknown){
    return render(
        <MemoryRouter initialEntries={[{pathname:'/receipts/scans/scan_abc/review',state}]}>
            <Routes>
                <Route path="/receipts/scans/:scanId/review" element={<ReceiptReviewPage/>}/>
            </Routes>
        </MemoryRouter>
    )
}

describe('ReceiptReviewPage',()=>{
    beforeEach(()=>{
        vi.clearAllMocks()
        vi.mocked(getReceiptScan).mockResolvedValue(scanResponse)
    })
    it('renders the review page using the scan passed from upload',()=>{
        renderReview({scan:scanResponse})
        expect(screen.getByRole('heading',{name:'Review your receipt'})).toBeInTheDocument()
        expect(screen.getByText('Receipt ready')).toBeInTheDocument()
        expect(screen.getByText('scan_abc')).toBeInTheDocument()
        expect(getReceiptScan).not.toHaveBeenCalled()
    })
    it('preserves the occurrence preselection',()=>{
        renderReview({scan:scanResponse})
        expect(screen.getByText('occ_123')).toBeInTheDocument()
        expect(screen.getByText('Payment preselected from your previous screen')).toBeInTheDocument()
    })
    it('loads the scan from the API after a refresh',async()=>{
        renderReview()
        expect(screen.getByRole('status')).toHaveTextContent('Loading your receipt...')
        expect(await screen.findByRole('heading',{name:'Review your receipt'})).toBeInTheDocument()
        expect(getReceiptScan).toHaveBeenCalledWith('scan_abc')
        expect(screen.getByText('scan_abc')).toBeInTheDocument()
    })
    it('shows a recovery message for an unavailable scan',async()=>{
        vi.mocked(getReceiptScan).mockRejectedValue({
            statusCode:404,
            error:{code:'RECEIPT_SCAN_NOT_FOUND'},
        })
        renderReview()
        expect(await screen.findByRole('alert')).toHaveTextContent('This receipt scan is unavailable or has expired.')
        expect(screen.getByRole('button',{name:'Scan another receipt'})).toBeInTheDocument()
    })
    it('preserves preselection when returning to scan after expiry',()=>{
        renderReview({
            scan:{...scanResponse,expiresAt:'2020-01-01T00:00:00.000Z'},
        })
        expect(screen.getByRole('alert')).toHaveTextContent('This receipt scan has expired.')
        fireEvent.click(screen.getByRole('button',{name:'Scan another receipt'}))
        expect(navigate).toHaveBeenCalledWith('/receipts/new?occurrenceId=occ_123')
    })
    it('retries when loading fails temporarily',async()=>{
        vi.mocked(getReceiptScan)
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce(scanResponse)
        renderReview()
        expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load your receipt.')
        fireEvent.click(screen.getByRole('button',{name:'Retry loading'}))
        await waitFor(()=>{
            expect(getReceiptScan).toHaveBeenCalledTimes(2)
        })
        expect(await screen.findByRole('heading',{name:'Review your receipt'})).toBeInTheDocument()
    })
    it('does not show payment confirmation before review is implemented',()=>{
        renderReview({scan:scanResponse})
        expect(screen.queryByRole('button',{name:'Confirm payment'})).not.toBeInTheDocument()
        expect(screen.getByText('No payment has been recorded.',{exact:false})).toBeInTheDocument()
    })
})