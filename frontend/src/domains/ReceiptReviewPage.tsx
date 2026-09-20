
import {useEffect,useState} from 'react'
import {useLocation,useNavigate,useParams} from 'react-router-dom'
import {ArrowLeft,CheckCircle2,FileText,RefreshCw} from 'lucide-react'
import {getReceiptScan,type ReceiptScan} from '../features/receipts/receiptsApi'
import ReceiptExtractionForm from '../components/receipts/ReceiptsExtractionFrom'

type ReviewLocationState={
    scan?:ReceiptScan
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
        }).catch(caught=>{
            if(!active)return
            const code=(caught as {error?:{code?:string}})?.error?.code
            setError(code==='RECEIPT_SCAN_NOT_FOUND'||(caught as {statusCode?:number})?.statusCode===404
                ?'This receipt scan is unavailable or has expired. Please scan the receipt again.'
                :'Unable to load your receipt. Please try again.')
            setScan(null)
        }).finally(()=>{
            if(active)setLoading(false)
        })
        return()=>{active=false}
    },[scanId,initialScan,retryCount])

    const displayError=!scanId
        ?'This receipt scan could not be found.'
        :isExpired
            ?'This receipt scan has expired. Please scan the receipt again.'
            :error

    const preselectedOccurrenceId=scan?.preselectedOccurrenceId??initialScan?.preselectedOccurrenceId
    const scanPath=preselectedOccurrenceId
        ?`/receipts/new?occurrenceId=${encodeURIComponent(preselectedOccurrenceId)}`
        :'/receipts/new'

    if(loading){
        return(
            <main className="min-h-[100dvh] bg-[#F4FBF7] px-5 py-8 text-[#091828] dark:bg-[#0b1326] dark:text-white">
                <div className="mx-auto w-full max-w-xl">
                    <p role="status" className="rounded-3xl bg-white px-5 py-6 text-sm font-semibold dark:bg-[#131b2e]">
                        Loading your receipt...
                    </p>
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
                        Receipt review
                    </span>
                </div>
                <section>
                    <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#AC2A5D] dark:text-[#ff6b9d]">
                        SpendSense
                    </p>
                    <h1 className="text-4xl font-black tracking-tight">
                        Review your receipt
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-[#6b6375] dark:text-[#a0aec0]">
                        Your receipt has been scanned. No payment has been recorded.
                    </p>
                </section>
                <section className="rounded-3xl border-2 border-[#091828] bg-white p-6 shadow-[5px_5px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[5px_5px_0_#060e20]">
                    <div className="flex items-start gap-4">
                        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#DCEFE8] dark:bg-[#0f4f42]">
                            <FileText className="size-7 text-[#10775F] dark:text-[#5eead4]"/>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="size-5 text-[#10775F] dark:text-[#5eead4]"/>
                                <h2 className="text-xl font-extrabold">Receipt ready</h2>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-[#6b6375] dark:text-[#a0aec0]">
                                Your temporary scan draft is ready for review.
                            </p>
                        </div>
                    </div>
                    <div className="mt-5 rounded-2xl bg-[#F4FBF7] px-4 py-4 dark:bg-[#1c263c]">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6375] dark:text-[#a0aec0]">
                            Receipt scan
                        </p>
                        <p className="mt-1 break-all text-sm font-semibold">{scan.id}</p>
                        <p className="mt-3 text-xs text-[#6b6375] dark:text-[#a0aec0]">
                            Draft expires {new Date(scan.expiresAt).toLocaleString('en-ZA')}
                        </p>
                    </div>
                    {scan.preselectedOccurrenceId&&(
                        <div className="mt-4 rounded-2xl bg-[#E8E4F4] px-4 py-3 dark:bg-[#302A43]">
                            <p className="text-xs font-bold text-[#5B4D8B] dark:text-[#c5b3f0]">
                                Payment preselected from your previous screen
                            </p>
                            <p className="mt-1 break-all text-xs text-[#6b6375] dark:text-[#a0aec0]">
                                {scan.preselectedOccurrenceId}
                            </p>
                        </div>
                    )}
                </section>
                <ReceiptExtractionForm key={scan.id} extraction={scan.extraction}/>
                <section className="rounded-3xl bg-[#E8E4F4] px-5 py-4 dark:bg-[#302A43]">
                    <p className="text-xs font-extrabold uppercase tracking-widest">
                        Before payment confirmation
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#6b6375] dark:text-[#a0aec0]">
                        Next, you will choose a payment occurrence and check the current outstanding balance before confirming anything.
                    </p>
                </section>
            </div>
        </main>
    )
}