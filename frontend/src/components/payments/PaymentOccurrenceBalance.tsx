import {useEffect,useState} from 'react'
import {RefreshCw,Wallet} from 'lucide-react'
import {getReceiptOccurrenceBalance,type ReceiptOccurrence} from '../../features/receipts/receiptOccurrencesApi'

type PaymentOccurrenceBalanceProps={
    occurrenceId:string
}
function formatMoney(value:string,currency:string){
    return `${currency==='ZAR'?'R':currency} ${value}`
}
export default function PaymentOccurrenceBalance({occurrenceId}:PaymentOccurrenceBalanceProps){
    const [balance,setBalance]=useState<ReceiptOccurrence|null>(null)
    const [loading,setLoading]=useState(true)
    const [error,setError]=useState<string|null>(null)
    const [retryCount,setRetryCount]=useState(0)
    useEffect(()=>{
        let active=true
        getReceiptOccurrenceBalance(occurrenceId).then(result=>{
            if(!active)return
            setBalance(result.occurrence)
            setError(null)
        }).catch(()=>{
            if(!active)return
            setBalance(null)
            setError('Unable to load the current payment balance. Please try again.')
        }).finally(()=>{
            if(active)setLoading(false)
        })
        return()=>{active=false}
    },[occurrenceId,retryCount])
    function refreshBalance(){
        if(loading)return
        setLoading(true)
        setError(null)
        setRetryCount(count=>count+1)
    }
    const canRecord=balance?.canRecord??(
        balance!==null&&
        balance.status!=='PAID'&&
        balance.status!=='PAID_LATE'&&
        balance.status!=='MISSED'&&
        balance.status!=='CANCELLED'&&
        Number(balance.amountRemaining)>0
    )
    return(
        <section className="rounded-3xl border-2 border-[#091828] bg-white p-4 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[4px_4px_0_#060e20]">
            <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#DCEFE8] dark:bg-[#0f4f42]">
                    <Wallet className="size-5 text-[#10775F] dark:text-[#5eead4]"/>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#6b6375] dark:text-[#a0aec0]">
                        Current payment balance
                    </p>
                    <h2 className="mt-1 text-lg font-extrabold text-[#091828] dark:text-white">
                        {balance?.obligationName??'Outstanding payment'}
                    </h2>
                </div>
                <button
                    type="button"
                    aria-label="Refresh payment balance"
                    onClick={refreshBalance}
                    disabled={loading}
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F4FBF7] text-[#10775F] disabled:opacity-50 dark:bg-[#1c263c] dark:text-[#5eead4]"
                >
                    <RefreshCw className={`size-5 ${loading?'animate-spin':''}`}/>
                </button>
            </div>
            {loading&&(
                <p role="status" className="mt-4 text-sm font-semibold text-[#6b6375] dark:text-[#a0aec0]">
                    Loading current payment balance...
                </p>
            )}
            {error&&(
                <p role="alert" className="mt-4 rounded-2xl bg-[#FFD9E1] px-4 py-3 text-sm font-semibold text-[#AC2A5D] dark:bg-[#4B2635] dark:text-[#ffb1c5]">
                    {error}
                </p>
            )}
            {balance&&!loading&&(
                <div className="mt-4">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-[#6b6375] dark:text-[#a0aec0]">
                            Occurrence status
                        </span>
                        <span className="rounded-full bg-[#E8E4F4] px-3 py-1 text-xs font-extrabold text-[#5B4D8B] dark:bg-[#302A43] dark:text-[#c5b3f0]">
                            {balance.status.replaceAll('_',' ')}
                        </span>
                    </div>
                    <div className="mt-4 space-y-3 rounded-2xl bg-[#F4FBF7] p-4 dark:bg-[#1c263c]">
                        <div className="flex justify-between gap-3 text-sm">
                            <span className="text-[#6b6375] dark:text-[#a0aec0]">Amount due</span>
                            <span className="font-bold text-[#091828] dark:text-white">
                                {formatMoney(balance.amountDue,balance.currency)}
                            </span>
                        </div>
                        <div className="flex justify-between gap-3 text-sm">
                            <span className="text-[#6b6375] dark:text-[#a0aec0]">Already paid</span>
                            <span className="font-bold text-[#091828] dark:text-white">
                                {formatMoney(balance.amountPaid,balance.currency)}
                            </span>
                        </div>
                        <div className="border-t border-[#DCEFE8] pt-3 dark:border-[#2d3449]">
                            <div className="flex justify-between gap-3">
                                <span className="text-sm font-extrabold text-[#091828] dark:text-white">
                                    Remaining
                                </span>
                                <span className="text-lg font-extrabold text-[#10775F] dark:text-[#5eead4]">
                                    {formatMoney(balance.amountRemaining,balance.currency)}
                                </span>
                            </div>
                        </div>
                    </div>
                    {!canRecord&&(
                        <p role="alert" className="mt-4 rounded-2xl bg-[#FFD9E1] px-4 py-3 text-xs font-semibold text-[#AC2A5D] dark:bg-[#4B2635] dark:text-[#ffb1c5]">
                            This payment can no longer accept contributions.
                        </p>
                    )}
                </div>
            )}
            <p className="mt-4 text-xs leading-5 text-[#6b6375] dark:text-[#a0aec0]">
                This balance comes from SpendSense and may change before you submit your payment.
            </p>
        </section>
    )
}