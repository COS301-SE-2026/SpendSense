
import {useState} from 'react'
import {CalendarDays,Check,ChevronLeft,ChevronRight,FileText,Info,TriangleAlert,X} from 'lucide-react'
import type {ReceiptExtraction,ReceiptConfidence} from '../../features/receipts/receiptsApi'

export type ReceiptReviewValues={
    amount:string
    currency:string
    merchant:string
    receiptDate:string
}

type ReceiptExtractionFormProps=Readonly<{
    extraction:ReceiptExtraction
    onChange?:(values:ReceiptReviewValues)=>void
}>

const confidenceStyles:Record<ReceiptConfidence,string>={
    HIGH:'bg-[#DCEFE8] text-[#10775F] dark:bg-[#0f4f42] dark:text-[#5eead4]',
    MEDIUM:'bg-[#FFE9B5] text-[#7A5A00] dark:bg-[#574821] dark:text-[#ffd166]',
    LOW:'bg-[#FFD9E1] text-[#AC2A5D] dark:bg-[#4B2635] dark:text-[#ffb1c5]',
    UNKNOWN:'bg-[#E8E4F4] text-[#5B4D8B] dark:bg-[#302A43] dark:text-[#c5b3f0]',
}

const weekdays=['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function getToday(){
    const today=new Date()
    const year=today.getFullYear()
    const month=String(today.getMonth()+1).padStart(2,'0')
    const day=String(today.getDate()).padStart(2,'0')
    return `${year}-${month}-${day}`
}

function formatDate(date:Date){
    const year=date.getFullYear()
    const month=String(date.getMonth()+1).padStart(2,'0')
    const day=String(date.getDate()).padStart(2,'0')
    return `${year}-${month}-${day}`
}

function getCalendarMonth(value:string){
    if(/^\d{4}-\d{2}-\d{2}$/.test(value)){
        const [year,month,day]=value.split('-').map(Number)
        const date=new Date(year,month-1,day)
        if(formatDate(date)===value)return new Date(year,month-1,1)
    }
    const today=new Date()
    return new Date(today.getFullYear(),today.getMonth(),1)
}

function getCalendarDays(month:Date){
    const year=month.getFullYear()
    const monthIndex=month.getMonth()
    const firstDay=new Date(year,monthIndex,1)
    const offset=(firstDay.getDay()+6)%7
    const daysInMonth=new Date(year,monthIndex+1,0).getDate()
    const days:(number|null)[]=[]

    for(let index=0;index<offset;index++){
        days.push(null)
    }

    for(let day=1;day<=daysInMonth;day++){
        days.push(day)
    }

    return days
}

function getInitialReceiptValues(extraction:ReceiptExtraction):ReceiptReviewValues{
    return{
        amount:extraction.amountCandidates[0]?.value??'',
        currency:extraction.amountCandidates[0]?.currency?.trim()||'ZAR',
        merchant:extraction.merchant?.value??'',
        receiptDate:extraction.receiptDate?.value??'',
    }
}

function ConfidenceBadge({confidence}:Readonly<{confidence:ReceiptConfidence}>){
    return(
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${confidenceStyles[confidence]}`}>
            {confidence} confidence
        </span>
    )
}

export default function ReceiptExtractionForm({extraction,onChange}:ReceiptExtractionFormProps){
    const [values,setValues]=useState<ReceiptReviewValues>(()=>getInitialReceiptValues(extraction))
    const [selectedCandidate,setSelectedCandidate]=useState<number|null>(
        extraction.amountCandidates.length>0?0:null
    )
    const [isCurrencyDefaulted,setIsCurrencyDefaulted]=useState(
        !extraction.amountCandidates[0]?.currency?.trim()
    )
    const [isCalendarOpen,setIsCalendarOpen]=useState(false)
    const [calendarMonth,setCalendarMonth]=useState(()=>getCalendarMonth(extraction.receiptDate?.value??''))

    function updateField(field:keyof ReceiptReviewValues,value:string){
        const next={...values,[field]:value}
        setValues(next)
        onChange?.(next)
        if(field==='amount'||field==='currency')setSelectedCandidate(null)
        if(field==='currency')setIsCurrencyDefaulted(false)
    }

    function selectCandidate(index:number){
        const candidate=extraction.amountCandidates[index]
        if(!candidate)return
        const currency= candidate.currency?.trim()||'ZAR'
        const next={
            ...values,
            amount:candidate.value,
            currency,
        }
        setValues(next)
        onChange?.(next)
        setSelectedCandidate(index)
        setIsCurrencyDefaulted(!candidate.currency?.trim())
    }

    function clearField(field:keyof ReceiptReviewValues){
        updateField(field,'')
        if(field==='receiptDate'){
            setCalendarMonth(getCalendarMonth(''))
            setIsCalendarOpen(false)
        }
    }

    function toggleCalendar(){
        if(!isCalendarOpen){
            setCalendarMonth(getCalendarMonth(values.receiptDate))
        }
        setIsCalendarOpen(current=>!current)
    }

    function changeMonth(amount:number){
        setCalendarMonth(current=>new Date(
            current.getFullYear(),
            current.getMonth()+amount,
            1
        ))
    }

    function selectDate(day:number){
        const date=new Date(
            calendarMonth.getFullYear(),
            calendarMonth.getMonth(),
            day
        )
        updateField('receiptDate',formatDate(date))
        setIsCalendarOpen(false)
    }

    function selectToday(){
        const today=new Date()
        updateField('receiptDate',getToday())
        setCalendarMonth(new Date(today.getFullYear(),today.getMonth(),1))
        setIsCalendarOpen(false)
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

    const today=getToday()
    const calendarDays=getCalendarDays(calendarMonth)
    const calendarLabel=calendarMonth.toLocaleDateString('en-ZA',{
        month:'long',
        year:'numeric',
    })

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
                                aria-label={`Use ${candidate.label} ${candidate.currency?.trim()||'ZAR'} ${candidate.value}`}
                                aria-pressed={selectedCandidate===index}
                                onClick={()=>selectCandidate(index)}
                                className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors ${selectedCandidate===index?'border-[#10775F] bg-[#DCEFE8] dark:border-[#5eead4] dark:bg-[#0f4f42]':'border-[#E3EAE6] bg-[#F4FBF7] hover:border-[#10775F] dark:border-[#2d3449] dark:bg-[#1c263c]'}`}
                            >
                                <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${selectedCandidate===index?'bg-[#10775F] text-white dark:bg-[#5eead4] dark:text-[#091828]':'bg-white text-[#6b6375] dark:bg-[#131b2e] dark:text-[#a0aec0]'}`}>
                                    {selectedCandidate===index?<Check className="size-5"/>:<span className="text-sm font-black">{index+1}</span>}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-base font-extrabold">
                                        {candidate.currency?.trim()||'ZAR'} {candidate.value}
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
                        No amount was found. Enter the payment amount manually.
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
                        <div className="flex min-h-6 items-center justify-between gap-2">
                            <label htmlFor="receipt-currency" className="text-xs font-bold text-[#091828] dark:text-white">
                                Currency
                            </label>
                            {isCurrencyDefaulted&&values.currency==='ZAR'&&(
                                <span className="rounded-full bg-[#E8F1FF] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#2455A4] dark:bg-[#203654] dark:text-[#93C5FD]">
                                    Assumed
                                </span>
                            )}
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

                {isCurrencyDefaulted&&values.currency==='ZAR'&&(
                    <div className="flex items-start gap-2 rounded-2xl border border-[#93B9F0] bg-[#E8F1FF] px-4 py-3 text-[#2455A4] dark:border-[#385C89] dark:bg-[#203654] dark:text-[#93C5FD]">
                        <Info className="mt-0.5 size-4 shrink-0"/>
                        <p className="text-xs font-semibold leading-5">
                            Defaulted to ZAR. Please double-check.
                        </p>
                    </div>
                )}

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

                    <div className="relative">
                        <div className="flex items-center gap-2">
                            <input
                                id="receipt-date"
                                type="text"
                                inputMode="numeric"
                                value={values.receiptDate}
                                onChange={event=>updateField('receiptDate',event.target.value)}
                                placeholder="YYYY-MM-DD"
                                className="min-w-0 flex-1 rounded-2xl bg-[#F4FBF7] px-4 py-4 text-sm font-semibold text-[#091828] outline-none placeholder:text-[#9b96a8] focus:ring-2 focus:ring-[#10775F] dark:bg-[#1c263c] dark:text-white dark:placeholder:text-[#a0aec0]"
                            />

                            <button
                                type="button"
                                aria-label="Choose receipt date"
                                aria-expanded={isCalendarOpen}
                                aria-controls="receipt-calendar"
                                onClick={toggleCalendar}
                                className="flex size-12 shrink-0 items-center justify-center rounded-2xl border-2 border-[#091828] bg-[#FFD9E1] text-[#AC2A5D] shadow-[3px_3px_0_#091828] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none dark:border-[#060e20] dark:bg-[#2d1b2e] dark:text-[#ff6b9d] dark:shadow-[3px_3px_0_#060e20]"
                            >
                                <CalendarDays className="size-5"/>
                            </button>

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

                        {isCalendarOpen&&(
                            <div
                                id="receipt-calendar"
                                aria-label="Receipt date calendar"
                                className="absolute right-0 top-full z-30 mt-3 w-[min(320px,calc(100vw-64px))] rounded-3xl border-2 border-[#091828] bg-white p-4 text-[#091828] shadow-[5px_5px_0_#091828] dark:border-[#060e20] dark:bg-[#1c263c] dark:text-white dark:shadow-[5px_5px_0_#060e20]"
                            >
                                <div className="mb-4 flex items-center justify-between gap-2">
                                    <button
                                        type="button"
                                        aria-label="Previous month"
                                        onClick={()=>changeMonth(-1)}
                                        className="flex size-9 items-center justify-center rounded-full bg-[#E8E4F4] text-[#5B4D8B] dark:bg-[#302A43] dark:text-[#c5b3f0]"
                                    >
                                        <ChevronLeft className="size-5"/>
                                    </button>

                                    <p className="text-sm font-extrabold">
                                        {calendarLabel}
                                    </p>

                                    <button
                                        type="button"
                                        aria-label="Next month"
                                        onClick={()=>changeMonth(1)}
                                        className="flex size-9 items-center justify-center rounded-full bg-[#E8E4F4] text-[#5B4D8B] dark:bg-[#302A43] dark:text-[#c5b3f0]"
                                    >
                                        <ChevronRight className="size-5"/>
                                    </button>
                                </div>

                                <div className="grid grid-cols-7 gap-1">
                                    {weekdays.map(day=>(
                                        <div
                                            key={day}
                                            className="flex h-8 items-center justify-center text-[11px] font-bold text-[#6b6375] dark:text-[#a0aec0]"
                                        >
                                            {day}
                                        </div>
                                    ))}

                                    {calendarDays.map((day,index)=>{
                                        if(day===null){
                                            return <div key={`empty-${index}`} className="size-9"/>
                                        }

                                        const date=formatDate(new Date(
                                            calendarMonth.getFullYear(),
                                            calendarMonth.getMonth(),
                                            day
                                        ))
                                        const isToday=date===today
                                        const isSelected=date===values.receiptDate

                                        return(
                                            <button
                                                key={date}
                                                type="button"
                                                aria-label={date}
                                                aria-pressed={isSelected}
                                                onClick={()=>selectDate(day)}
                                                className={`flex size-9 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                                                    isSelected
                                                        ?'bg-[#10775F] text-white dark:bg-[#5eead4] dark:text-[#091828]'
                                                        :isToday
                                                            ?'border-2 border-[#FF6B9D] bg-[#FFD9E1] text-[#AC2A5D] dark:border-[#ff6b9d] dark:bg-[#2d1b2e] dark:text-[#ffb1c5]'
                                                            :'hover:bg-[#DCEFE8] dark:hover:bg-[#0f4f42]'
                                                }`}
                                            >
                                                {day}
                                            </button>
                                        )
                                    })}
                                </div>

                                <div className="mt-4 flex items-center justify-between border-t border-[#E3EAE6] pt-3 dark:border-[#2d3449]">
                                    <button
                                        type="button"
                                        onClick={selectToday}
                                        className="rounded-full bg-[#FFD9E1] px-4 py-2 text-xs font-extrabold text-[#AC2A5D] dark:bg-[#2d1b2e] dark:text-[#ffb1c5]"
                                    >
                                        Today
                                    </button>

                                    <button
                                        type="button"
                                        onClick={()=>setIsCalendarOpen(false)}
                                        className="text-xs font-bold text-[#6b6375] dark:text-[#a0aec0]"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
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