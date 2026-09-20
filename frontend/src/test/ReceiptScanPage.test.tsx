import React from 'react'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {describe,it,expect,vi,beforeEach} from 'vitest'
import '@testing-library/jest-dom'
import ReceiptScanPage from '../domains/ReceiptScanPage'
import {scanReceipt} from '../features/receipts/receiptsApi'

const navigate=vi.fn()
const getUserMedia=vi.fn()

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
        getUserMedia.mockReset()
        Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia}})
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
    it.each([
        ['UNSUPPORTED_RECEIPT','Please upload a JPEG or PNG receipt.'],
        ['RECEIPT_TOO_LARGE','Your receipt is too large. Maximum 8 MiB.'],
        ['OCR_NO_USABLE_RESULT',"We couldn't read this receipt. Try another photo or enter the payment manually."],
        ['OCR_BUSY','Receipt scanning is busy. Please try again.'],
        ['OCR_UNAVAILABLE','Receipt scanning is temporarily unavailable.'],
    ])('shows the %s scan error and manual fallback',async(code,message)=>{
        vi.mocked(scanReceipt).mockRejectedValue({statusCode:422,error:{code,message:'Server error'}})
        render(
            <MemoryRouter>
                <ReceiptScanPage/>
            </MemoryRouter>
        )
        const file=new File(['receipt'],'receipt.jpg',{type:'image/jpeg'})
        fireEvent.change(screen.getByLabelText('Upload receipt image'),{target:{files:[file]}})
        fireEvent.click(screen.getByRole('button',{name:'Scan receipt'}))
        expect(await screen.findByRole('alert')).toHaveTextContent(message)
        expect(screen.getByAltText('Receipt preview')).toBeInTheDocument()
        expect(screen.getByRole('button',{name:'Scan receipt'})).toBeEnabled()
        expect(screen.getByRole('button',{name:'Enter payment manually'})).toBeInTheDocument()
        expect(screen.queryByText('Receipt scanned. Ready for review.')).not.toBeInTheDocument()
    })
    it('retries a failed scan with the original image',async()=>{
        vi.mocked(scanReceipt).mockRejectedValueOnce({error:{code:'OCR_BUSY'}}).mockResolvedValueOnce(scanResponse)
        render(
            <MemoryRouter>
                <ReceiptScanPage/>
            </MemoryRouter>
        )
        const file=new File(['receipt'],'receipt.jpg',{type:'image/jpeg'})
        fireEvent.change(screen.getByLabelText('Upload receipt image'),{target:{files:[file]}})
        fireEvent.click(screen.getByRole('button',{name:'Scan receipt'}))
        expect(await screen.findByRole('alert')).toHaveTextContent('Receipt scanning is busy.')
        fireEvent.click(screen.getByRole('button',{name:'Scan receipt'}))
        expect(await screen.findByText('Receipt scanned. Ready for review.')).toBeInTheDocument()
        expect(scanReceipt).toHaveBeenCalledTimes(2)
        expect(scanReceipt).toHaveBeenNthCalledWith(1,file,undefined)
        expect(scanReceipt).toHaveBeenNthCalledWith(2,file,undefined)
        expect(screen.queryByRole('button',{name:'Enter payment manually'})).not.toBeInTheDocument()
    })
    it('replaces an image before uploading and releases its old preview',async()=>{
        vi.mocked(scanReceipt).mockResolvedValue(scanResponse)
        render(
            <MemoryRouter>
                <ReceiptScanPage/>
            </MemoryRouter>
        )
        const first=new File(['first'],'first.jpg',{type:'image/jpeg'})
        const second=new File(['second'],'second.png',{type:'image/png'})
        fireEvent.change(screen.getByLabelText('Upload receipt image'),{target:{files:[first]}})
        fireEvent.change(screen.getByLabelText('Upload receipt image'),{target:{files:[second]}})
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:receipt-preview')
        fireEvent.click(screen.getByRole('button',{name:'Scan receipt'}))
        await waitFor(()=>expect(scanReceipt).toHaveBeenCalledWith(second,undefined))
    })
    it('preserves occurrence preselection when entering payment manually',async()=>{
        vi.mocked(scanReceipt).mockRejectedValue({error:{code:'OCR_NO_USABLE_RESULT'}})
        render(
            <MemoryRouter initialEntries={['/receipts/new?occurrenceId=occ_123']}>
                <ReceiptScanPage/>
            </MemoryRouter>
        )
        const file=new File(['receipt'],'receipt.jpg',{type:'image/jpeg'})
        fireEvent.change(screen.getByLabelText('Upload receipt image'),{target:{files:[file]}})
        fireEvent.click(screen.getByRole('button',{name:'Scan receipt'}))
        fireEvent.click(await screen.findByRole('button',{name:'Enter payment manually'}))
        expect(navigate).toHaveBeenCalledWith('/paymentForm?occurrenceId=occ_123')
    })
    it('opens manual entry without preselection when no occurrence exists',async()=>{
        vi.mocked(scanReceipt).mockRejectedValue(new Error('Network error'))
        render(
            <MemoryRouter>
                <ReceiptScanPage/>
            </MemoryRouter>
        )
        const file=new File(['receipt'],'receipt.jpg',{type:'image/jpeg'})
        fireEvent.change(screen.getByLabelText('Upload receipt image'),{target:{files:[file]}})
        fireEvent.click(screen.getByRole('button',{name:'Scan receipt'}))
        fireEvent.click(await screen.findByRole('button',{name:'Enter payment manually'}))
        expect(navigate).toHaveBeenCalledWith('/paymentForm')
    })
    it('keeps file upload available when camera permission is denied',async()=>{
        getUserMedia.mockRejectedValue(Object.assign(new Error('Denied'),{name:'NotAllowedError'}))
        render(
            <MemoryRouter>
                <ReceiptScanPage/>
            </MemoryRouter>
        )
        fireEvent.click(screen.getByRole('button',{name:'Take photo'}))
        expect(await screen.findByRole('alert')).toHaveTextContent('Camera access was denied. You can still upload an image.')
        expect(screen.getByRole('button',{name:'Upload image'})).toBeEnabled()
        const file=new File(['receipt'],'receipt.png',{type:'image/png'})
        fireEvent.change(screen.getByLabelText('Upload receipt image'),{target:{files:[file]}})
        expect(screen.getByAltText('Receipt preview')).toBeInTheDocument()
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
    it('captures a receipt photo and stops the camera',async()=>{
        const stop=vi.fn()
        getUserMedia.mockResolvedValue({getTracks:()=>[{stop}]})
        vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage:vi.fn()} as unknown as CanvasRenderingContext2D)
        vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(callback=>callback(new Blob(['photo'],{type:'image/jpeg'})))
        render(
            <MemoryRouter>
                <ReceiptScanPage/>
            </MemoryRouter>
        )
        fireEvent.click(screen.getByRole('button',{name:'Take photo'}))
        const capture=await screen.findByRole('button',{name:'Capture receipt'})
        const video=screen.getByLabelText('Receipt camera preview')
        Object.defineProperty(video,'videoWidth',{configurable:true,value:640})
        Object.defineProperty(video,'videoHeight',{configurable:true,value:480})
        fireEvent.click(capture)
        expect(await screen.findByAltText('Receipt preview')).toBeInTheDocument()
        expect(stop).toHaveBeenCalledTimes(1)
        vi.restoreAllMocks()
    })
    it('does not persist receipt data to browser storage',()=>{
        render(
            <MemoryRouter>
                <ReceiptScanPage/>
            </MemoryRouter>
        )
        const storageSpy=vi.spyOn(Storage.prototype,'setItem')
        const file=new File(['private receipt bytes'],'receipt.jpg',{type:'image/jpeg'})
        fireEvent.change(screen.getByLabelText('Upload receipt image'),{target:{files:[file]}})
        expect(screen.getByAltText('Receipt preview')).toBeInTheDocument()
        expect(storageSpy).not.toHaveBeenCalled()
        storageSpy.mockRestore()
    })
})