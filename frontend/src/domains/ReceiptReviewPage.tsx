import {useCallback,useEffect,useState} from 'react'
import {useLocation,useNavigate,useParams} from 'react-router-dom'
import {ArrowLeft,Clock3,RefreshCw} from 'lucide-react'
import {getReceiptScan,type ReceiptScan,type ReceiptExtraction,type ReceiptConfirmationResult} from '../features/receipts/receiptsApi'
import type {ReceiptOccurrence} from '../features/receipts/receiptOccurrencesApi'
import ReceiptExtractionForm,{type ReceiptReviewValues} from '../components/receipts/ReceiptExtractionForm'
import ReceiptOccurrencePicker from '../components/receipts/ReceiptOccurencePicker'
import ReceiptConfirmationPanel from '../components/receipts/ReceiptConfirmationPanel'

type ReviewLocationState={
    scan?:ReceiptScan
}

function getInitialReceiptValues(extraction:ReceiptExtraction):ReceiptReviewValues{
    return{
        amount:extraction.amountCandidates[0]?.value??'',
        currency:extraction.amountCandidates[0]?.currency??'',
        merchant:extraction.merchant?.value??'',
        receiptDate:extraction.receiptDate?.value??'',
    }
}

function getDisplayError(scanId:string|undefined,isExpired:boolean,error:string|null){
    if(!scanId)return 'This receipt scan could not be found.'
    if(isExpired)return 'This receipt scan has expired. Please scan the receipt again.'
    return error
}

export default function ReceiptReviewPage(){
    const navigate=useNavigate()
    const location=useLocation()
    const {scanId}=useParams<{scanId:string}>()
    const locationState=location.state as ReviewLocationState|null
    const routeScan=locationState?.scan
    const initialScan:ReceiptScan|null=routeScan&&routeScan.id===scanId?routeScan:null
    const [scan,setScan]=useState<ReceiptScan|null>(initialScan)
    const [loading,setLoading]=useState(Boolean(scanId&&!initialScan))
    const [error,setError]=useState<string|null>(null)
    const [retryCount,setRetryCount]=useState(0)
    const [selectedOccurrence,setSelectedOccurrence]=useState<ReceiptOccurrence|null>(null)
    const [editedValues,setEditedValues]=useState<ReceiptReviewValues|null>(null)
    const [confirmedResult,setConfirmedResult]=useState<ReceiptConfirmationResult|null>(null)
    const [isExpired,setIsExpired]=useState(()=>{
        return initialScan?new Date(initialScan.expiresAt).getTime()<=Date.now():false
    })

    useEffect(()=>{
        if(!scanId||initialScan)return
        let active=true
        getReceiptScan(scanId).then(result=>{
            if(!active)return
            setScan(result)
            setIsExpired(new Date(result.expiresAt).getTime()<=Date.now())
            setError(null)
        }).catch(error=>{
            if(!active)return
            const code=(error as {error?:{code?:string}})?.error?.code
            setError(code==='RECEIPT_SCAN_NOT_FOUND'||(error as {statusCode?:number})?.statusCode===404
                ?'This receipt scan is unavailable or has expired. Please scan the receipt again.'
                :'Unable to load your receipt. Please try again.')
            setScan(null)
        }).finally(()=>{
            if(active)setLoading(false)
        })
        return()=>{active=false}
    },[scanId,initialScan,retryCount])

    const handleOccurrenceSelect=useCallback((occurrence:ReceiptOccurrence|null)=>{
        setSelectedOccurrence(occurrence)
    },[])

    const handleValuesChange=useCallback((values:ReceiptReviewValues)=>{
        setEditedValues(values)
    },[])

    const handleConfirmed=useCallback((result:ReceiptConfirmationResult)=>{
        setConfirmedResult(result)
    },[])

    const displayError=getDisplayError(scanId,isExpired,error)

    const preselectedOccurrenceId=scan?.preselectedOccurrenceId??initialScan?.preselectedOccurrenceId
    const scanPath=preselectedOccurrenceId
        ?`/receipts/new?occurrenceId=${encodeURIComponent(preselectedOccurrenceId)}`
        :'/receipts/new'

    if(loading){
        return(
            <main className="min-h-[100dvh] bg-[#F4FBF7] px-5 py-8 text-[#091828] dark:bg-[#0b1326] dark:text-white">
                <div className="mx-auto w-full max-w-xl">
                    <output className="block rounded-3xl bg-white px-5 py-6 text-sm font-semibold dark:bg-[#131b2e]">
                        Loading your receipt...
                    </output>
                </div>
            </main>
        )
    }

    if(displayError||!scan){
        return(
            <main className="min-h-[100dvh] bg-[#F4FBF7] px-5 py-8 text-[#091828] dark:bg-[#0b1326] dark:text-white">
                <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
                    <button
                        type="button"
                        onClick={()=>navigate(-1)}
                        aria-label="Go back"
                        className="flex size-11 items-center justify-center rounded-full bg-[#FF6B9D] text-[#091828] dark:bg-[#ffb1c5] dark:text-[#650030]"
                    >
                        <ArrowLeft className="size-5"/>
                    </button>
                    <section className="rounded-3xl border-2 border-[#091828] bg-white p-6 shadow-[5px_5px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[5px_5px_0_#060e20]">
                        <h1 className="text-2xl font-extrabold">Receipt unavailable</h1>
                        <p role="alert" className="mt-3 text-sm text-[#6b6375] dark:text-[#a0aec0]">
                            {displayError??'This receipt scan could not be found.'}
                        </p>
                        <button
                            type="button"
                            onClick={()=>navigate(scanPath)}
                            className="mt-6 w-full rounded-full bg-[#091828] px-5 py-4 text-sm font-bold text-white dark:bg-[#ff6b9d] dark:text-[#650030]"
                        >
                            Scan another receipt
                        </button>
                        {error==='Unable to load your receipt. Please try again.'&&(
                            <button
                                type="button"
                                onClick={()=>{setLoading(true);setRetryCount(count=>count+1)}}
                                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#DCEFE8] px-5 py-4 text-sm font-bold text-[#091828] dark:bg-[#0f4f42] dark:text-[#5eead4]"
                            >
                                <RefreshCw className="size-4"/>
                                Retry loading
                            </button>
                        )}
                    </section>
                </div>
            </main>
        )
    }

    const values=editedValues??getInitialReceiptValues(scan.extraction)

    return(
        <main className="min-h-[100dvh] bg-[#F4FBF7] px-5 py-8 text-[#091828] dark:bg-[#0b1326] dark:text-white">
            <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
                <div className="flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={()=>navigate(-1)}
                        aria-label="Go back"
                        className="flex size-11 items-center justify-center rounded-full bg-[#FF6B9D] text-[#091828] dark:bg-[#ffb1c5] dark:text-[#650030]"
                    >
                        <ArrowLeft className="size-5"/>
                    </button>
                    <span className="rounded-full bg-[#FFD9E1] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#AC2A5D] dark:bg-[#4B2635] dark:text-[#ffb1c5]">
                        {confirmedResult?'Payment result':'Receipt review'}
                    </span>
                </div>
                <section>
                    <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#AC2A5D] dark:text-[#ff6b9d]">
                        SpendSense
                    </p>
                    <h1 className="text-4xl font-black tracking-tight">
                        {confirmedResult?'Your payment':'Review your receipt'}
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-[#6b6375] dark:text-[#a0aec0]">
                        {confirmedResult
                            ?'Your receipt payment has been recorded. The result below comes from SpendSense.'
                            :'Your receipt has been scanned. No payment has been recorded.'}
                    </p>
                    {!confirmedResult&&(
                        <p className="mt-3 flex items-center gap-2 text-xs font-medium text-[#6b6375] dark:text-[#a0aec0]">
                            <Clock3 className="size-4 shrink-0 text-[#10775F] dark:text-[#5eead4]"/>
                            Draft expires {new Date(scan.expiresAt).toLocaleString('en-ZA')}
                        </p>
                    )}
                </section>
                {!confirmedResult&&(
                    <>
                        <ReceiptExtractionForm
                            key={`${scan.id}-extraction`}
                            extraction={scan.extraction}
                            onChange={handleValuesChange}
                        />
                        <ReceiptOccurrencePicker
                            key={`${scan.id}-occurrence`}
                            preselectedOccurrenceId={scan.preselectedOccurrenceId}
                            selectedOccurrence={selectedOccurrence}
                            onSelect={handleOccurrenceSelect}
                        />
                    </>
                )}
                <ReceiptConfirmationPanel
                    key={`${scan.id}-confirmation`}
                    scanId={scan.id}
                    values={values}
                    occurrence={selectedOccurrence}
                    onOccurrenceChange={handleOccurrenceSelect}
                    onConfirmed={handleConfirmed}
                />
                {confirmedResult&&(
                    <button
                        type="button"
                        onClick={()=>navigate('/domains/dashboard')}
                        className="rounded-full bg-[#091828] px-5 py-4 text-sm font-extrabold text-white dark:bg-[#FF6B9D] dark:text-[#650030]"
                    >
                        Return to dashboard
                    </button>
                )}
            </div>
        </main>
    )
}