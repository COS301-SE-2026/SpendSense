
import {useCallback,useEffect,useState} from 'react'
import {useLocation,useNavigate,useParams} from 'react-router-dom'
import {Clock3,RefreshCw} from 'lucide-react'
import {SubPageShell} from '@/components/common/SubPageShell'
import {LongButton} from '@/components/common/LongButton'
import {CustomCard} from '@/components/ui/CustomCard'
import {getReceiptScan,type ReceiptScan,type ReceiptExtraction,type ReceiptConfirmationResult} from '@/features/receipts/receiptsApi'
import type {ReceiptOccurrence} from '@/features/receipts/receiptOccurrencesApi'
import ReceiptExtractionForm,{type ReceiptReviewValues} from '@/components/receipts/ReceiptExtractionForm'
import ReceiptOccurrencePicker from '@/components/receipts/ReceiptOccurencePicker'
import ReceiptConfirmationPanel from '@/components/receipts/ReceiptConfirmationPanel'

type ReviewLocationState={
    scan?:ReceiptScan
}

function getInitialReceiptValues(extraction:ReceiptExtraction):ReceiptReviewValues{
    return{
        amount:extraction.amountCandidates[0]?.value??'',
        currency:extraction.amountCandidates[0]?.currency?.trim()||'ZAR',
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
            <SubPageShell title="Receipt review">
                <output role="status" className="block rounded-3xl bg-white px-5 py-6 text-sm font-semibold dark:bg-[#131b2e]">
                    Loading your receipt...
                </output>
            </SubPageShell>
        )
    }

    if(displayError||!scan){
        return(
            <SubPageShell title="Receipt review">
                <CustomCard variant="navyShaddow" size="md" className="rounded-3xl border-2 border-[#091828] p-6 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:shadow-[4px_4px_0_#060e20]">
                    <h1 className="text-2xl font-extrabold">Receipt unavailable</h1>
                    <p role="alert" className="mt-3 text-sm text-[#6b6375] dark:text-[#a0aec0]">
                        {displayError??'This receipt scan could not be found.'}
                    </p>
                    <LongButton type="button" LongVariant="primaryPinkBorder" showArrow={false} onClick={()=>navigate(scanPath)} className="mt-6">
                        Scan another receipt
                    </LongButton>
                    {error==='Unable to load your receipt. Please try again.'&&(
                        <LongButton type="button" LongVariant="outline" showArrow={false} onClick={()=>{setLoading(true);setRetryCount(count=>count+1)}} className="mt-3">
                            <RefreshCw className="mr-2 size-4"/>
                            Retry loading
                        </LongButton>
                    )}
                </CustomCard>
            </SubPageShell>
        )
    }

    const values=editedValues??getInitialReceiptValues(scan.extraction)

    return(
        <SubPageShell title={confirmedResult?'Payment result':'Receipt review'}>
            <section>
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
                <LongButton type="button" LongVariant="primaryPinkBorder" showArrow={false} onClick={()=>navigate('/domains/dashboard')}>
                    Return to dashboard
                </LongButton>
            )}
        </SubPageShell>
    )
}