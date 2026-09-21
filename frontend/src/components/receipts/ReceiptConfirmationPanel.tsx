import {useRef,useState} from 'react'
import {CheckCircle2,Info,RefreshCw,ShieldCheck,TriangleAlert} from 'lucide-react'
import {confirmReceiptPayment,type ReceiptConfirmationBody,type ReceiptConfirmationResult} from '../../features/receipts/receiptsApi'
import {getReceiptOccurrenceBalance,type ReceiptOccurrence} from '../../features/receipts/receiptOccurrencesApi'
import type {ReceiptReviewValues} from './ReceiptExtractionForm'

type ReceiptConfirmationPanelProps=Readonly<{
    scanId:string
    values:ReceiptReviewValues
    occurrence:ReceiptOccurrence|null
    onOccurrenceChange:(occurrence:ReceiptOccurrence|null)=>void
    onConfirmed?:(result:ReceiptConfirmationResult)=>void
}>

type ConfirmationAttempt={
    key:string
    body:ReceiptConfirmationBody
}

function moneyToCents(value:string):bigint|null{
    if(!/^\d+(?:\.\d{1,2})?$/.test(value))return null
    const [whole,fraction='']=value.split('.')
    return BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'))
}

function centsToMoney(value:bigint){
    return `${value/100n}.${(value%100n).toString().padStart(2,'0')}`
}

function isValidDate(value:string){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false
    const parsed=new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===value
}

function getToday(){
    const today=new Date()
    const year=today.getFullYear()
    const month=String(today.getMonth()+1).padStart(2,'0')
    const day=String(today.getDate()).padStart(2,'0')
    return `${year}-${month}-${day}`
}

function ResultDetails({title,value}:Readonly<{title:string;value:unknown}>){
    if(value===null||value===undefined)return null
    return(
        <div className="mt-4 rounded-2xl bg-white p-4 text-[#091828] dark:bg-[#1c263c] dark:text-white">
            <h3 className="text-sm font-extrabold">{title}</h3>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6">
                {JSON.stringify(value,null,2)}
            </pre>
        </div>
    )
}

function ReceiptConfirmationResult({result}:Readonly<{result:ReceiptConfirmationResult}>){
    const completed=moneyToCents(result.occurrence.amountRemaining)===0n
    const settled=completed&&(
        result.occurrence.status==='PAID'||
        result.occurrence.status==='PAID_LATE'
    )

    return(
        <section className={`rounded-3xl border-2 border-[#091828] p-6 shadow-[5px_5px_0_#091828] dark:border-white dark:shadow-[5px_5px_0_#FFFFFF] ${settled?'bg-[#E8E4F4] dark:bg-[#302A43]':'bg-[#DCEFE8] dark:bg-[#0f4f42]'}`}>
            <CheckCircle2 className={`size-12 ${settled?'text-[#5B4D8B] dark:text-[#c5b3f0]':'text-[#10775F] dark:text-[#5eead4]'}`}/>
            <h2 className="mt-4 text-2xl font-black">
                {settled?'Payment complete!':'Partially paid'}
            </h2>
            <output className="mt-2 block text-sm leading-6">
                {settled
                    ?'SpendSense confirmed your receipt payment and completed this scheduled payment.'
                    :'SpendSense confirmed your receipt payment. An outstanding balance remains.'}
            </output>
            <div className="mt-5 rounded-2xl bg-white p-4 text-[#091828] dark:bg-[#1c263c] dark:text-white">
                <p className="text-xs font-bold uppercase tracking-widest opacity-60">
                    Scheduled payment
                </p>
                <p className="mt-1 text-lg font-black">
                    {result.occurrence.obligationName}
                </p>
                <p className="mt-4 text-xs font-bold uppercase tracking-widest opacity-60">
                    Amount recorded
                </p>
                <p className="mt-1 text-2xl font-black">
                    {result.contribution.currency} {result.contribution.amount}
                </p>
                <p className="mt-4 text-xs font-bold uppercase tracking-widest opacity-60">
                    Total already paid
                </p>
                <p className="mt-1 text-lg font-extrabold">
                    {result.occurrence.currency} {result.occurrence.amountPaid}
                </p>
                <p className="mt-4 text-xs font-bold uppercase tracking-widest opacity-60">
                    Remaining balance
                </p>
                <p className="mt-1 text-2xl font-black text-[#10775F] dark:text-[#5eead4]">
                    {result.occurrence.currency} {result.occurrence.amountRemaining}
                </p>
                <p className="mt-4 text-xs font-bold uppercase tracking-widest opacity-60">
                    Payment date
                </p>
                <p className="mt-1 text-sm font-bold">
                    {result.contribution.paidDate}
                </p>
                <p className="mt-4 text-xs font-bold uppercase tracking-widest opacity-60">
                    Payment status
                </p>
                <p className="mt-1 text-sm font-bold">
                    {result.occurrence.status.replaceAll('_',' ')}
                </p>
            </div>
            {settled&&(
                <>
                    <ResultDetails title="Settlement details" value={result.settlement}/>
                    <ResultDetails title="Score impact" value={result.scoreImpact}/>
                    <ResultDetails title="Rewards" value={result.rewards}/>
                </>
            )}
            <p className="mt-5 break-all text-xs opacity-70">
                Contribution reference: {result.contribution.id}
            </p>
            {result.replayed&&(
                <p className="mt-3 text-xs font-semibold opacity-70">
                    SpendSense recovered your original payment confirmation. No second contribution was created.
                </p>
            )}
        </section>
    )
}

export default function ReceiptConfirmationPanel({
    scanId,
    values,
    occurrence,
    onOccurrenceChange,
    onConfirmed,
}:ReceiptConfirmationPanelProps){
    const [acknowledged,setAcknowledged]=useState(false)
    const [processing,setProcessing]=useState(false)
    const [error,setError]=useState<string|null>(null)
    const [result,setResult]=useState<ReceiptConfirmationResult|null>(null)
    const [blocked,setBlocked]=useState(false)
    const attemptRef=useRef<ConfirmationAttempt|null>(null)
    const processingRef=useRef(false)

    const amountCents=moneyToCents(values.amount.trim())
    const remainingCents=occurrence?moneyToCents(occurrence.amountRemaining):null
    const canRecord=occurrence?.canRecord??(
        occurrence!==null&&
        occurrence.status!=='PAID'&&
        occurrence.status!=='PAID_LATE'&&
        occurrence.status!=='MISSED'&&
        occurrence.status!=='CANCELLED'&&
        remainingCents!==null&&remainingCents>0n
    )
    const currencyMatches=occurrence!==null&&values.currency.trim().toUpperCase()===occurrence.currency
    const amountValid=amountCents!==null&&amountCents>0n
    const amountFits=amountValid&&remainingCents!==null&&amountCents<=remainingCents
    const dateValid=isValidDate(values.receiptDate)&&values.receiptDate<=getToday()
    const currencyValid=/^[A-Z]{3}$/.test(values.currency.trim().toUpperCase())
    const previewRemaining=occurrence&&amountFits&&remainingCents!==null
        ?centsToMoney(remainingCents-amountCents)
        :null
    const canConfirm=Boolean(
        !blocked&&occurrence&&canRecord&&amountValid&&amountFits&&currencyValid&&currencyMatches&&dateValid&&acknowledged
    )

    function getValidationMessage(){
        if(blocked)return 'This receipt cannot be submitted again.'
        if(!occurrence)return 'Choose a payment occurrence before confirming.'
        if(!canRecord)return 'This occurrence can no longer accept payments.'
        if(!amountValid)return 'Enter a payment amount greater than zero with no more than two decimal places.'
        if(!currencyValid)return 'Enter a valid three-letter currency code.'
        if(!currencyMatches)return 'The receipt currency must match the selected payment currency.'
        if(!dateValid)return 'Enter a valid payment date that is not in the future.'
        if(!amountFits)return 'The payment amount cannot exceed the outstanding balance.'
        if(!acknowledged)return 'Confirm that you made this payment before continuing.'
        return null
    }

    async function handleConfirmationError(error:unknown){
        const failure=error as{
            statusCode?:number
            error?:{
                code?:string
            }
        }
        const code=failure.error?.code
        if(code==='SCAN_EXPIRED'){
            attemptRef.current=null
            setBlocked(true)
            setError('This receipt scan has expired. Please scan the receipt again.')
        }else if(code==='SCAN_ALREADY_CONSUMED'){
            attemptRef.current=null
            setBlocked(true)
            setError('This receipt has already been used for a payment. Check your payment history before trying again.')
        }else if(
            code==='AMOUNT_EXCEEDS_REMAINING'||
            code==='OCCURRENCE_NOT_PAYABLE'||
            code==='CURRENCY_MISMATCH'
        ){
            attemptRef.current=null
            setAcknowledged(false)
            setError('The payment details have changed. Review the latest balance before confirming again.')
            try{
                if(!occurrence)return
                const updated=await getReceiptOccurrenceBalance(occurrence.id)
                onOccurrenceChange(updated.occurrence)
            }catch{
                onOccurrenceChange(null)
                setError('Unable to refresh the payment balance. Please choose the payment again.')
            }
        }else if(code==='IDEMPOTENCY_KEY_REUSED'){
            attemptRef.current=null
            setBlocked(true)
            setError('This payment request could not be safely retried. Please check your payment history.')
        }else if(failure.statusCode&&failure.statusCode>=400&&failure.statusCode<500){
            attemptRef.current=null
            setError('Please check your payment details before trying again.')
        }else{
            setError('We could not confirm whether the payment was recorded. Retry to check the same request safely.')
        }
    }

    async function handleConfirm(){
        if(processingRef.current||result||blocked)return
        const validation=getValidationMessage()
        if(validation){
            setError(validation)
            return
        }
        if(!occurrence||amountCents===null)return
        const body:ReceiptConfirmationBody={
            occurrenceId:occurrence.id,
            amount:centsToMoney(amountCents),
            currency:values.currency.trim().toUpperCase(),
            paidDate:values.receiptDate,
            acknowledged:true,
        }
        const existing=attemptRef.current
        if(existing&&JSON.stringify(existing.body)!==JSON.stringify(body)){
            setError('Your previous payment request has an uncertain result. Restore the original payment details before retrying.')
            return
        }
        processingRef.current=true
        setProcessing(true)
        setError(null)
        try{
            if(!existing){
                const latest=await getReceiptOccurrenceBalance(occurrence.id)
                const current=latest.occurrence
                const changed=current.amountRemaining!==occurrence.amountRemaining||
                    current.currency!==occurrence.currency||
                    current.status!==occurrence.status||
                    current.canRecord===false

                onOccurrenceChange(current)
                if(changed){
                    attemptRef.current=null
                    setAcknowledged(false)
                    setError('The payment balance has changed. Review the updated balance and confirm again.')
                    return
                }
                attemptRef.current={
                    key:crypto.randomUUID(),
                    body,
                }
            }
            const attempt=attemptRef.current
            if(!attempt)return
            const confirmation=await confirmReceiptPayment(scanId,attempt.body,attempt.key)
            attemptRef.current=null
            setResult(confirmation)
            onOccurrenceChange(confirmation.occurrence)
            onConfirmed?.(confirmation)
        }catch(error){
            await handleConfirmationError(error)
        }finally{
            processingRef.current=false
            setProcessing(false)
        }
    }

    if(result)return <ReceiptConfirmationResult result={result}/>

    return(
        <section className="rounded-3xl border-2 border-[#091828] bg-white p-5 shadow-[5px_5px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[5px_5px_0_#060e20] sm:p-6">
            <div className="flex items-start gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#DCEFE8] dark:bg-[#0f4f42]">
                    <ShieldCheck className="size-6 text-[#10775F] dark:text-[#5eead4]"/>
                </div>
                <div>
                    <p className="text-xs font-extrabold uppercase tracking-widest text-[#AC2A5D] dark:text-[#ffb1c5]">
                        Final check
                    </p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight">
                        Confirm your payment
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#6b6375] dark:text-[#a0aec0]">
                        Check the amount and outstanding balance before recording your payment.
                    </p>
                </div>
            </div>
            {occurrence&&(
                <div className="mt-6 rounded-2xl bg-[#F4FBF7] p-4 dark:bg-[#1c263c]">
                    <p className="text-sm font-extrabold">{occurrence.obligationName}</p>
                    <div className="mt-5 space-y-3">
                        <div className="flex justify-between gap-3 text-sm">
                            <span className="text-[#6b6375] dark:text-[#a0aec0]">
                                Current outstanding
                            </span>
                            <span className="font-bold">
                                {occurrence.currency} {occurrence.amountRemaining}
                            </span>
                        </div>
                        <div className="flex justify-between gap-3 text-sm">
                            <span className="text-[#6b6375] dark:text-[#a0aec0]">
                                Payment amount
                            </span>
                            <span className="font-bold">
                                {values.currency||occurrence.currency} {values.amount||'0.00'}
                            </span>
                        </div>
                        <div className="border-t border-[#DCEFE8] pt-3 dark:border-[#2d3449]">
                            <div className="flex justify-between gap-3">
                                <span className="text-sm font-extrabold">
                                    Expected remaining
                                </span>
                                <span className="text-lg font-black text-[#10775F] dark:text-[#5eead4]">
                                    {previewRemaining===null?'Check amount':`${occurrence.currency} ${previewRemaining}`}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className="mt-5 rounded-2xl bg-[#E8E4F4] px-4 py-3 dark:bg-[#302A43]">
                <p className="flex items-start gap-2 text-xs font-semibold leading-5 text-[#5B4D8B] dark:text-[#c5b3f0]">
                    <Info className="mt-0.5 size-4 shrink-0"/>
                    The expected balance is only a preview. SpendSense will validate the current balance again when you confirm.
                </p>
            </div>
            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-[#DCEFE8] px-4 py-4 dark:border-[#2d3449]">
                <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={event=>{setAcknowledged(event.target.checked);setError(null)}}
                    disabled={processing||blocked}
                    className="mt-1 size-5 accent-[#10775F]"
                />
                <span className="text-sm font-semibold leading-6">
                    I confirm that I made this payment and have checked the receipt details.
                </span>
            </label>
            {error&&(
                <div role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-[#FFD9E1] px-4 py-3 text-sm font-semibold text-[#AC2A5D] dark:bg-[#4B2635] dark:text-[#ffb1c5]">
                    <TriangleAlert className="mt-0.5 size-5 shrink-0"/>
                    <span>{error}</span>
                </div>
            )}
            <button
                type="button"
                onClick={handleConfirm}
                disabled={!canConfirm||processing}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#091828] px-5 py-4 text-sm font-extrabold text-white transition disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#FF6B9D] dark:text-[#650030]"
            >
                {processing&&<RefreshCw className="size-4 animate-spin"/>}
                {processing?'Confirming payment...':'Confirm payment'}
            </button>
            <p className="mt-3 text-center text-xs text-[#6b6375] dark:text-[#a0aec0]">
                Your payment is only recorded after you press Confirm payment.
            </p>
        </section>
    )
}