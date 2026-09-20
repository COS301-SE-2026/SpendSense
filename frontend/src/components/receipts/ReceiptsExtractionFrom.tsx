
import {useState} from 'react'
import {Check,FileText,Info,TriangleAlert,X} from 'lucide-react'
import type {ReceiptExtraction,ReceiptConfidence} from '../../features/receipts/receiptsApi'

export type ReceiptReviewValues={
    amount:string
    currency:string
    merchant:string
    receiptDate:string
}

type ReceiptExtractionFormProps={
    extraction:ReceiptExtraction
}

const confidenceStyles:Record<ReceiptConfidence,string>={
    HIGH:'bg-[#DCEFE8] text-[#10775F] dark:bg-[#0f4f42] dark:text-[#5eead4]',
    MEDIUM:'bg-[#FFE9B5] text-[#7A5A00] dark:bg-[#574821] dark:text-[#ffd166]',
    LOW:'bg-[#FFD9E1] text-[#AC2A5D] dark:bg-[#4B2635] dark:text-[#ffb1c5]',
    UNKNOWN:'bg-[#E8E4F4] text-[#5B4D8B] dark:bg-[#302A43] dark:text-[#c5b3f0]',
}

function ConfidenceBadge({confidence}:{confidence:ReceiptConfidence}){
    return(
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${confidenceStyles[confidence]}`}>
            {confidence} confidence
        </span>
    )
}

export default function ReceiptExtractionForm({extraction}:ReceiptExtractionFormProps){
    const [values,setValues]=useState<ReceiptReviewValues>({
        amount:extraction.amountCandidates[0]?.value??'',
        currency:extraction.amountCandidates[0]?.currency??'',
        merchant:extraction.merchant?.value??'',
        receiptDate:extraction.receiptDate?.value??'',
    })
    const [selectedCandidate,setSelectedCandidate]=useState<number|null>(
        extraction.amountCandidates.length>0?0:null
    )

    function updateField(field:keyof ReceiptReviewValues,value:string){
        setValues(current=>({...current,[field]:value}))
        if(field==='amount'||field==='currency')setSelectedCandidate(null)
    }

    function selectCandidate(index:number){
        const candidate=extraction.amountCandidates[index]
        if(!candidate)return
        setValues(current=>({
            ...current,
            amount:candidate.value,
            currency:candidate.currency,
        }))
        setSelectedCandidate(index)
    }

    function clearField(field:keyof ReceiptReviewValues){
        updateField(field,'')
    }

    const selectedAmount=selectedCandidate===null
        ?null
        :extraction.amountCandidates[selectedCandidate]
    const merchantConfidence=values.merchant===extraction.merchant?.value
        ?extraction.merchant?.confidence
        :null
    const receiptDateConfidence=values.receiptDate===extraction.receiptDate?.value
        ?extraction.receiptDate?.confidence
        :null

    return(
        <section className="rounded-3xl border-2 border-[#091828] bg-white p-5 shadow-[5px_5px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[5px_5px_0_#060e20] sm:p-6">
            <div className="flex items-start gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFE9B5] dark:bg-[#574821]">
                    <FileText className="size-6 text-[#7A5A00] dark:text-[#ffd166]"/>
                </div>
                <div>
                    <p className="text-xs font-extrabold uppercase tracking-widest text-[#AC2A5D] dark:text-[#ffb1c5]">
                        OCR suggestions
                    </p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight">
                        Check your receipt
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#6b6375] dark:text-[#a0aec0]">
                        Review the suggested details below. You can change or clear anything the scanner found.
                    </p>
                </div>
            </div>

            {extraction.amountCandidates.length>0&&(
                <div className="mt-6">
                    <p className="text-xs font-extrabold uppercase tracking-widest text-[#6b6375] dark:text-[#a0aec0]">
                        Suggested amounts
                    </p>
                    <div className="mt-3 flex flex-col gap-3">
                        {extraction.amountCandidates.map((candidate,index)=>(
                            <button
                                key={`${candidate.label}-${candidate.currency}-${candidate.value}-${index}`}
                                type="button"
                                aria-label={`Use ${candidate.label} ${candidate.currency} ${candidate.value}`}
                                aria-pressed={selectedCandidate===index}
                                onClick={()=>selectCandidate(index)}
                                className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors ${selectedCandidate===index?'border-[#10775F] bg-[#DCEFE8] dark:border-[#5eead4] dark:bg-[#0f4f42]':'border-[#E3EAE6] bg-[#F4FBF7] hover:border-[#10775F] dark:border-[#2d3449] dark:bg-[#1c263c]'}`}
                            >
                                <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${selectedCandidate===index?'bg-[#10775F] text-white dark:bg-[#5eead4] dark:text-[#091828]':'bg-white text-[#6b6375] dark:bg-[#131b2e] dark:text-[#a0aec0]'}`}>
                                    {selectedCandidate===index?<Check className="size-5"/>:<span className="text-sm font-black">{index+1}</span>}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-base font-extrabold">
                                        {candidate.currency} {candidate.value}
                                    </p>
                                    <p className="mt-0.5 text-xs capitalize text-[#6b6375] dark:text-[#a0aec0]">
                                        {candidate.label}
                                    </p>
                                </div>
                                <ConfidenceBadge confidence={candidate.confidence}/>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {extraction.amountCandidates.length===0&&(
                <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#FFE9B5] px-4 py-3 text-[#7A5A00] dark:bg-[#574821] dark:text-[#ffd166]">
                    <Info className="mt-0.5 size-5 shrink-0"/>
                    <p className="text-sm font-semibold">
                        No amount was found. Enter the payment amount and currency manually.
                    </p>
                </div>
            )}

            <div className="mt-6 space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_130px]">
                    <div className="space-y-2">
                        <div className="flex min-h-6 items-center justify-between gap-2">
                            <label htmlFor="receipt-amount" className="text-xs font-bold text-[#091828] dark:text-white">
                                Amount paid
                            </label>
                            {selectedAmount&&<ConfidenceBadge confidence={selectedAmount.confidence}/>}
                        </div>
                        <div className="relative">
                            <input
                                id="receipt-amount"
                                type="text"
                                inputMode="decimal"
                                value={values.amount}
                                onChange={event=>updateField('amount',event.target.value)}
                                placeholder="0.00"
                                className="w-full rounded-2xl bg-[#F4FBF7] px-4 py-4 pr-12 text-base font-semibold text-[#091828] outline-none focus:ring-2 focus:ring-[#10775F] dark:bg-[#1c263c] dark:text-white"
                            />
                            {values.amount&&(
                                <button
                                    type="button"
                                    aria-label="Clear amount"
                                    onClick={()=>clearField('amount')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b6375] dark:text-[#a0aec0]"
                                >
                                    <X className="size-5"/>
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex min-h-6 items-center">
                            <label htmlFor="receipt-currency" className="text-xs font-bold text-[#091828] dark:text-white">
                                Currency
                            </label>
                        </div>
                        <div className="relative">
                            <input
                                id="receipt-currency"
                                type="text"
                                value={values.currency}
                                onChange={event=>updateField('currency',event.target.value.toUpperCase())}
                                placeholder="ZAR"
                                maxLength={3}
                                className="w-full rounded-2xl bg-[#F4FBF7] px-4 py-4 pr-11 text-base font-semibold uppercase text-[#091828] outline-none focus:ring-2 focus:ring-[#10775F] dark:bg-[#1c263c] dark:text-white"
                            />
                            {values.currency&&(
                                <button
                                    type="button"
                                    aria-label="Clear currency"
                                    onClick={()=>clearField('currency')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6375] dark:text-[#a0aec0]"
                                >
                                    <X className="size-5"/>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex min-h-6 items-center justify-between gap-2">
                        <label htmlFor="receipt-merchant" className="text-xs font-bold text-[#091828] dark:text-white">
                            Merchant
                        </label>
                        {merchantConfidence&&<ConfidenceBadge confidence={merchantConfidence}/>}
                    </div>
                    <div className="relative">
                        <input
                            id="receipt-merchant"
                            type="text"
                            value={values.merchant}
                            onChange={event=>updateField('merchant',event.target.value)}
                            placeholder="Enter merchant"
                            className="w-full rounded-2xl bg-[#F4FBF7] px-4 py-4 pr-12 text-sm font-semibold text-[#091828] outline-none placeholder:text-[#9b96a8] focus:ring-2 focus:ring-[#10775F] dark:bg-[#1c263c] dark:text-white dark:placeholder:text-[#a0aec0]"
                        />
                        {values.merchant&&(
                            <button
                                type="button"
                                aria-label="Clear merchant"
                                onClick={()=>clearField('merchant')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b6375] dark:text-[#a0aec0]"
                            >
                                <X className="size-5"/>
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex min-h-6 items-center justify-between gap-2">
                        <label htmlFor="receipt-date" className="text-xs font-bold text-[#091828] dark:text-white">
                            Receipt date
                        </label>
                        {receiptDateConfidence&&<ConfidenceBadge confidence={receiptDateConfidence}/>}
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            id="receipt-date"
                            type="date"
                            value={values.receiptDate}
                            onChange={event=>updateField('receiptDate',event.target.value)}
                            className="min-w-0 flex-1 rounded-2xl bg-[#F4FBF7] px-4 py-4 text-sm font-semibold text-[#091828] outline-none focus:ring-2 focus:ring-[#10775F] dark:bg-[#1c263c] dark:text-white"
                        />
                        {values.receiptDate&&(
                            <button
                                type="button"
                                aria-label="Clear receipt date"
                                onClick={()=>clearField('receiptDate')}
                                className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#F4FBF7] text-[#6b6375] dark:bg-[#1c263c] dark:text-[#a0aec0]"
                            >
                                <X className="size-5"/>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {extraction.warnings.length>0&&(
                <div className="mt-6 rounded-2xl bg-[#FFF1D5] p-4 dark:bg-[#574821]">
                    <div className="flex items-center gap-2 text-[#7A5A00] dark:text-[#ffd166]">
                        <TriangleAlert className="size-5"/>
                        <h3 className="text-sm font-extrabold">Things to double-check</h3>
                    </div>
                    <ul className="mt-3 space-y-2">
                        {extraction.warnings.map((warning,index)=>(
                            <li key={`${warning}-${index}`} className="text-sm leading-6 text-[#7A5A00] dark:text-[#ffd166]">
                                {warning}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="mt-6 rounded-2xl bg-[#E8E4F4] px-4 py-3 dark:bg-[#302A43]">
                <p className="flex items-start gap-2 text-xs font-semibold leading-5 text-[#5B4D8B] dark:text-[#c5b3f0]">
                    <Info className="mt-0.5 size-4 shrink-0"/>
                    OCR results are suggestions. Please check the details against your receipt before confirming a payment.
                </p>
            </div>
        </section>
    )
}