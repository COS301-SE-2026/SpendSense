"use client";
import {useState,useEffect,useCallback,type ReactNode} from "react";
import {useForm,Controller,useWatch,type Resolver} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {useLocation,useNavigate} from "react-router-dom";
import {LongButton} from "../components/common/LongButton";
import {createManualContribution,getUpcomingOccurrences,type ManualContributionBody,type ManualContributionResult} from "../features/payments/paymentsApi";
import type {CalendarOccurrence} from "../hooks/useCalendarOccurrences";
import {getReceiptOccurrenceBalance,type ReceiptOccurrence} from "../features/receipts/receiptOccurrencesApi";
import {Popover,PopoverContent,PopoverTrigger} from "../components/ui/popover";
import {Calendar as CalenderIcon,CheckCircle2,Coins,Flame,TrendingUp,X,Camera,ChevronDown,Check,CreditCard} from "lucide-react";
import {Calendar} from "@/components/ui/calendar";
import PaymentOccurrenceBalance from "../components/payments/PaymentOccurrenceBalance";

const paymentSchema=z.object({
    occurrenceId:z.string().min(1,"OccurrenceID is required."),
    amountPaid:z.coerce.number()
        .positive("Amount must be greater than 0")
        .refine(value=>Math.abs(value*100-Math.round(value*100))<0.0000001,"Amount cannot have more than two decimal places."),
    paidDate:z.date({message:"A start date is required."}),
    notes:z.string().optional(),
});

type PaymentFormData=z.infer<typeof paymentSchema>;
type ContributionAttempt={
    key:string;
    body:ManualContributionBody;
};
function moneyToCents(value:string|number):bigint|null{
    const text=String(value).trim()
    if(!/^\d+(?:\.\d{1,2})?$/.test(text))return null
    const [whole,fraction='']=text.split('.')
    return BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'))
}
function centsToMoney(value:bigint){
    return `${value/100n}.${(value%100n).toString().padStart(2,'0')}`
}
function canOccurrenceRecord(balance:ReceiptOccurrence){
    const remaining=moneyToCents(balance.amountRemaining)
    return balance.canRecord??(
        balance.status!=='PAID'&&
        balance.status!=='PAID_LATE'&&
        balance.status!=='MISSED'&&
        balance.status!=='CANCELLED'&&
        remaining!==null&&remaining>0n
    )
}
function contributionToBalance(result:ManualContributionResult):ReceiptOccurrence{
    const occurrence=result.occurrence
    const remaining=moneyToCents(occurrence.amountRemaining)
    return{
        id:occurrence.id,
        obligationId:occurrence.obligationId,
        obligationName:occurrence.obligationName,
        dueDate:occurrence.dueDate,
        currency:occurrence.currency,
        amountDue:occurrence.amountDue,
        amountPaid:occurrence.amountPaid,
        amountRemaining:occurrence.amountRemaining,
        status:occurrence.status,
        canRecord:
            occurrence.status!=='PAID'&&
            occurrence.status!=='PAID_LATE'&&
            occurrence.status!=='MISSED'&&
            occurrence.status!=='CANCELLED'&&
            remaining!==null&&remaining>0n,
    }
}
function getApiFailure(error:unknown){
    const failure=error as{
        statusCode?:number;
        message?:string;
        error?:string|{code?:string;message?:string};
        data?:{code?:string;message?:string};
    };
    const nested=typeof failure.error==="object"?failure.error:undefined;
    return{
        statusCode:failure.statusCode,
        code:nested?.code??failure.data?.code,
        message:nested?.message??failure.data?.message??failure.message??(typeof failure.error==="string"?failure.error:""),
    };
}
function isBalanceConflict(code:string|undefined,message:string){
    return code==="AMOUNT_EXCEEDS_REMAINING"||
        code==="OCCURRENCE_NOT_PAYABLE"||
        code==="CURRENCY_MISMATCH"||
        message.includes("exceeds remaining balance")||
        message.includes("cannot receive another contribution")||
        message.includes("does not match occurrence currency");
}
export default function ObligationForm(){
    const navigate=useNavigate();
    const location=useLocation();
    const selectedPayment=location.state as {
        occurrence?:{
            id:string;
            amountDue:number|string;
            currency:string;
            dueDate:string;
            status:string;
        };
        obligation?:{
            name:string;
            type:string;
        };
    }|null;
    const selectedOccurrence=selectedPayment?.occurrence;
    const fallbackOccurrenceId=new URLSearchParams(location.search??'').get('occurrenceId')??'';
    const selectedObligation=selectedPayment?.obligation;
    const selectedAmount=Number(selectedOccurrence?.amountDue??0);
    const [showPopup,setShowPopup]=useState(false);
    const [paymentResult,setPaymentResult]=useState<ManualContributionResult|null>(null);
    const [submitError,setSubmitError]=useState<string|null>(null);
    const [isSubmitting,setSubmitting]=useState(false);
    const [occurrences,setOccurrences]=useState<CalendarOccurrence[]>([]);
    const [occurrencesLoading,setOccurrencesLoading]=useState(true);
    const [occurrencesError,setOccurrencesError]=useState<string|null>(null);
    const [isOccurrencePickerOpen,setIsOccurrencePickerOpen]=useState(false);
    const [currentBalance,setCurrentBalance]=useState<ReceiptOccurrence|null>(null);
    const [amountEdited,setAmountEdited]=useState(false);
    const [attempt,setAttempt]=useState<ContributionAttempt|null>(null);
    const [submissionBlocked,setSubmissionBlocked]=useState(false);
    const{
        register,
        handleSubmit,
        control,
        getValues,
        setValue,
        formState:{errors},
    }=useForm<PaymentFormData>({
        resolver:zodResolver(paymentSchema) as Resolver<PaymentFormData>,
        defaultValues:{
            occurrenceId:selectedOccurrence?.id??fallbackOccurrenceId,
            amountPaid:selectedAmount,
            paidDate:new Date(),
            notes:""
        }satisfies PaymentFormData,
    });
    const watchedOccurrenceId=useWatch({control,name:"occurrenceId"});
    const watchedAmount=useWatch({control,name:"amountPaid"});
    const balanceOccurrenceId=selectedOccurrence?.id??watchedOccurrenceId;
    const balanceForSelection=currentBalance?.id===balanceOccurrenceId?currentBalance:null;
    const remainingCents=balanceForSelection?moneyToCents(balanceForSelection.amountRemaining):null;
    const amountCents=moneyToCents(watchedAmount);
    const validAmount=amountCents!==null&&amountCents>0n;
    const amountFits=validAmount&&remainingCents!==null&&amountCents<=remainingCents;
    const expectedRemaining=amountFits&&remainingCents!==null&&amountCents!==null
        ?centsToMoney(remainingCents-amountCents)
        :null;
    const isPartial=amountFits&&remainingCents!==null&&amountCents!==null&&amountCents<remainingCents;
    const canRecord=balanceForSelection?canOccurrenceRecord(balanceForSelection):false;
    const handleBalanceChange=useCallback((balance:ReceiptOccurrence|null)=>{
        setCurrentBalance(balance);
    },[]);
    useEffect(()=>{
        if(currentBalance&&currentBalance.id===balanceOccurrenceId&&!amountEdited){
            setValue("amountPaid",Number(currentBalance.amountRemaining));
        }
    },[currentBalance,balanceOccurrenceId,amountEdited,setValue]);
    useEffect(()=>{
        let active=true;
        getUpcomingOccurrences({
            status:"PENDING,OVERDUE",
            perPage:100,
        }).then(response=>{
            if(!active)return;
            const raw=response as {data:{data:CalendarOccurrence[]}};
            setOccurrences(raw?.data?.data??[]);
        }).catch(()=>{
            if(active)setOccurrencesError("Unable to load available payments. Please try again.");
        }).finally(()=>{
            if(active)setOccurrencesLoading(false);
        });
        return()=>{active=false};
    },[]);
    const onSubmit=async(formData:PaymentFormData)=>{
        if(isSubmitting||showPopup||submissionBlocked)return;
        setSubmitError(null);
        if(!balanceForSelection||!canRecord||!amountFits||amountCents===null){
            setSubmitError("Check the current payment balance and enter a valid amount.");
            return;
        }
        const body:ManualContributionBody={
            occurrenceId:balanceForSelection.id,
            amount:centsToMoney(amountCents),
            currency:balanceForSelection.currency,
            paidDate:formData.paidDate.toISOString().split("T")[0],
            notes:formData.notes?.trim()||undefined,
        };
        const existingAttempt=attempt;
        if(existingAttempt&&JSON.stringify(existingAttempt.body)!==JSON.stringify(body)){
            setSubmitError("Your previous payment request has an uncertain result. Restore the original payment details before retrying.");
            return;
        }
        setSubmitting(true);
        let contributionRequested=false;
        try{
            if(!existingAttempt){
                const latestResponse=await getReceiptOccurrenceBalance(balanceForSelection.id);
                const latest=latestResponse.occurrence;
                const changed=
                    latest.amountRemaining!==balanceForSelection.amountRemaining||
                    latest.amountPaid!==balanceForSelection.amountPaid||
                    latest.currency!==balanceForSelection.currency||
                    latest.status!==balanceForSelection.status||
                    latest.canRecord!==balanceForSelection.canRecord;
                setCurrentBalance(latest);
                if(changed){
                    setAttempt(null);
                    setSubmitError("The payment balance has changed. Review the updated balance before trying again.");
                    return;
                }
            }
            const request=existingAttempt??{key:crypto.randomUUID(),body};
            setAttempt(request);
            contributionRequested=true;
            const result=await createManualContribution(request.body,request.key);
            setAttempt(null);
            setCurrentBalance(contributionToBalance(result));
            setPaymentResult(result);
            setShowPopup(true);
        }catch(error){
            const failure=getApiFailure(error);
            if(!contributionRequested){
                setAttempt(null);
                setSubmitError("Unable to refresh the current payment balance. Please try again.");
            }else if(isBalanceConflict(failure.code,failure.message)){
                setAttempt(null);
                try{
                    const refreshed=await getReceiptOccurrenceBalance(balanceForSelection.id);
                    setCurrentBalance(refreshed.occurrence);
                    setSubmitError("The payment balance has changed. Review the updated balance before trying again.");
                }catch{
                    setCurrentBalance(null);
                    setSubmitError("The payment balance has changed, but SpendSense could not refresh it. Please select the payment again.");
                }
            }else if(
                failure.code==="IDEMPOTENCY_KEY_REUSED"||
                failure.message.includes("Idempotency key has already been used with different payment data")
            ){
                setAttempt(null);
                setSubmissionBlocked(true);
                setSubmitError("This payment request could not be safely retried. Check your payment history before submitting another payment.");
            }else if(failure.statusCode&&failure.statusCode>=400&&failure.statusCode<500){
                setAttempt(null);
                setSubmitError(failure.message||"Please check your payment details before trying again.");
            }else{
                setSubmitError("We could not confirm whether the payment was recorded. Retry the same payment to check safely.");
            }
        }finally{
            setSubmitting(false);
        }
    }

    return(
        <div className="min-h-screen bg-[#F4FBF7] pb-24 dark:bg-[#0b1326]">
            <div className="mx-auto w-full max-w-md px-5 pt-6">
                <div className="flex items-center justify-between gap-3 pb-4">
                    <button
                        type="button"
                        aria-label="Clear form"
                        onClick={()=>navigate(-1)}
                        className="size-11 rounded-full bg-[#FF6B9D] flex items-center justify-center text-[#091828] flex-shrink-0 border-none dark:bg-[#ffb1c5] dark:text-[#650030]"
                    >
                        <X className="size-5"/>
                    </button>
                    <h1 className="flex-1 text-center text-xl font-medium text-[#091828] dark:text-white">Add Payment</h1>
                    <div className="size-11" aria-hidden="true"/>
                </div>
                <button
                    type="button"
                    onClick={()=>{
                        const id=selectedOccurrence?.id??getValues('occurrenceId')
                        navigate(id?`/receipts/new?occurrenceId=${encodeURIComponent(id)}`:'/receipts/new')
                    }}
                    className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#DCEFE8] px-4 py-3.5 text-sm font-semibold text-[#091828] dark:bg-[#0f4f42] dark:text-[#5eead4]"
                >
                    <Camera className="size-5"/>
                    Scan receipt instead
                </button>
                {selectedOccurrence&&selectedObligation&&(
                    <div className="rounded-3xl border-2 border-[#091828] bg-white p-4 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[4px_4px_0_#060e20]">
                        <p className="text-xs font-bold uppercase tracking-wide text-[#6b6375] dark:text-[#a0aec0]">Selected payment</p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-lg font-extrabold text-[#091828] dark:text-white">{selectedObligation.name}</p>
                                <p className="text-xs font-semibold text-[#6b6375] dark:text-[#a0aec0]">{selectedObligation.type} | {selectedOccurrence.status}</p>
                            </div>
                            <p className="text-lg font-extrabold text-[#AC2A5D] dark:text-[#ff6b9d]">
                                {selectedOccurrence.currency==="ZAR"?"R":selectedOccurrence.currency} {selectedAmount.toFixed(2)}
                            </p>
                        </div>
                    </div>
                )}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full">
                    {selectedOccurrence?(
                        <input type="hidden" {...register("occurrenceId")}/>
                    ):(
                        <>
                            <Controller
                                control={control}
                                name="occurrenceId"
                                render={({field})=>{
                                    const selected=occurrences.find(occurrence=>occurrence.id===field.value)
                                    return(
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-[#091828] dark:text-white">Allocate payment to</label>
                                            <Popover open={isOccurrencePickerOpen} onOpenChange={setIsOccurrencePickerOpen}>
                                                <PopoverTrigger asChild>
                                                    <button
                                                        type="button"
                                                        aria-label="Allocate payment to"
                                                        aria-expanded={isOccurrencePickerOpen}
                                                        disabled={occurrencesLoading}
                                                        className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-left text-[#091828] outline-none disabled:opacity-50 dark:bg-[#131b2e] dark:text-white"
                                                    >
                                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#E8E4F4] text-[#5B4D8B] dark:bg-[#28223f] dark:text-[#c5b3f0]">
                                                            <CreditCard className="size-5"/>
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-semibold">
                                                                {selected?.obligation.name??(field.value?'Previously selected payment':occurrencesLoading?'Loading available payments...':'Select a payment')}
                                                            </p>
                                                            <p className="mt-0.5 text-xs text-[#6b6375] dark:text-[#a0aec0]">
                                                                {selected?`${selected.currency==='ZAR'?'R':selected.currency} ${Number(selected.amountDue).toFixed(2)} · Due ${selected.dueDate.slice(0,10)}`:'Choose from your outstanding payments'}
                                                            </p>
                                                        </div>
                                                        <ChevronDown className={`size-5 shrink-0 text-[#6b6375] transition-transform dark:text-[#a0aec0] ${isOccurrencePickerOpen?'rotate-180':''}`}/>
                                                    </button>
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    align="start"
                                                    className="w-[var(--radix-popover-trigger-width)] rounded-2xl border-2 border-[#091828] bg-white p-2 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[4px_4px_0_#060e20]"
                                                >
                                                    <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-[#6b6375] dark:text-[#a0aec0]">
                                                        Available payments
                                                    </p>
                                                    <div className="max-h-72 space-y-1 overflow-y-auto">
                                                        {fallbackOccurrenceId&&!selected&&(
                                                            <button
                                                                type="button"
                                                                onClick={()=>{
                                                                    field.onChange(fallbackOccurrenceId)
                                                                    setAmountEdited(false)
                                                                    setIsOccurrencePickerOpen(false)
                                                                }}
                                                                className="flex w-full items-center gap-3 rounded-xl bg-[#F4FBF7] px-3 py-3 text-left text-sm text-[#091828] dark:bg-[#1c263c] dark:text-white"
                                                            >
                                                                <CreditCard className="size-5"/>
                                                                <span className="flex-1">Previously selected payment</span>
                                                                {field.value===fallbackOccurrenceId&&<Check className="size-5 text-[#10775F]"/>}
                                                            </button>
                                                        )}
                                                        {occurrences.map(occurrence=>(
                                                            <button
                                                                key={occurrence.id}
                                                                type="button"
                                                                onClick={()=>{
                                                                    field.onChange(occurrence.id)
                                                                    setAmountEdited(false)
                                                                    setIsOccurrencePickerOpen(false)
                                                                }}
                                                                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[#F4FBF7] dark:hover:bg-[#1c263c] ${field.value===occurrence.id?'bg-[#DCEFE8] dark:bg-[#0f4f42]':''}`}
                                                            >
                                                                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FFE9B5] text-[#7A5A00] dark:bg-[#3a3118] dark:text-[#ffd166]">
                                                                    <CreditCard className="size-5"/>
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="truncate text-sm font-semibold text-[#091828] dark:text-white">
                                                                        {occurrence.obligation.name}
                                                                    </p>
                                                                    <p className="mt-0.5 text-xs text-[#6b6375] dark:text-[#a0aec0]">
                                                                        Due {occurrence.dueDate.slice(0,10)}
                                                                    </p>
                                                                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${occurrence.status==='OVERDUE'?'bg-[#FFD9E1] text-[#AC2A5D] dark:bg-[#4B2635] dark:text-[#ffb1c5]':'bg-[#DCEFE8] text-[#10775F] dark:bg-[#0f4f42] dark:text-[#5eead4]'}`}>
                                                                        {occurrence.status==='OVERDUE'?'OVERDUE':'PENDING'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex shrink-0 flex-col items-end gap-2">
                                                                    <span className="text-sm font-bold text-[#091828] dark:text-white">
                                                                        {occurrence.currency==='ZAR'?'R':occurrence.currency} {Number(occurrence.amountDue).toFixed(2)}
                                                                    </span>
                                                                    {field.value===occurrence.id&&<Check className="size-5 text-[#10775F] dark:text-[#5eead4]"/>}
                                                                </div>
                                                            </button>
                                                        ))}
                                                        {occurrences.length===0&&!fallbackOccurrenceId&&(
                                                            <p className="px-3 py-4 text-center text-sm text-[#6b6375] dark:text-[#a0aec0]">
                                                                No available payments found.
                                                            </p>
                                                        )}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    )
                                }}
                            />
                            {occurrencesError&&<p role="alert" className="text-xs text-red-500 dark:text-[#ffb4ab]">{occurrencesError}</p>}
                            {errors.occurrenceId?.message&&<p className="text-xs text-red-500 dark:text-[#ffb4ab]">{errors.occurrenceId.message}</p>}
                        </>
                    )}
                    {balanceOccurrenceId&&(
                        <PaymentOccurrenceBalance
                            key={balanceOccurrenceId}
                            occurrenceId={balanceOccurrenceId}
                            onBalanceChange={handleBalanceChange}
                            currentBalance={balanceForSelection}
                        />
                    )}
                    <div className="space-y-1">
                        <label htmlFor="amountPaid" className="text-xs font-semibold text-[#091828] dark:text-white">Amount paid</label>
                        <input
                            id="amountPaid"
                            inputMode="decimal"
                            {...register("amountPaid",{
                                onChange:()=>setAmountEdited(true),
                            })}
                            placeholder="R0.00"
                            className="w-full rounded-2xl bg-white px-4 py-3.5 text-sm text-[#091828] outline-none dark:bg-[#131b2e] dark:text-white"
                        />
                    </div>
                    {errors.amountPaid?.message&&<p className="text-xs text-red-500 dark:text-[#ffb4ab]">{errors.amountPaid.message}</p>}
                    {balanceForSelection&&(
                        <div className="rounded-2xl bg-[#DCEFE8] px-4 py-4 dark:bg-[#0f4f42]">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-semibold text-[#091828] dark:text-white">
                                    Expected remaining
                                </span>
                                <span className="text-lg font-extrabold text-[#10775F] dark:text-[#5eead4]">
                                    {expectedRemaining===null?'Check amount':`${balanceForSelection.currency==='ZAR'?'R':balanceForSelection.currency} ${expectedRemaining}`}
                                </span>
                            </div>
                            {amountCents!==null&&remainingCents!==null&&amountCents>remainingCents&&(
                                <p role="alert" className="mt-2 text-xs font-semibold text-[#AC2A5D] dark:text-[#ffb1c5]">
                                    Amount cannot exceed the outstanding balance.
                                </p>
                            )}
                            {isPartial&&(
                                <p className="mt-2 text-xs font-semibold text-[#10775F] dark:text-[#5eead4]">
                                    This amount will leave an outstanding balance.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label htmlFor="paidDate" className="text-xs font-semibold text-[#091828] dark:text-white mb-1">Date paid</label>
                        <Controller
                            control={control}
                            name="paidDate"
                            render={({field})=>(
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            className="flex w-full items-center rounded-2xl bg-white px-4 py-3.5 text-left text-sm text-[#091828] dark:bg-[#131b2e] dark:text-white"
                                        >
                                            <CalenderIcon className="mr-2 h-4 w-4 text-[#6b6375] dark:text-[#a0aec0]"/>
                                            {field.value?(
                                                new Intl.DateTimeFormat('en-US',{dateStyle:'long'}).format(new Date(field.value))
                                            ):(
                                                <span className="text-gray-400 dark:text-[#a0aec0]">Select date</span>
                                            )}
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-white border rounded-md shadow-md dark:border-[#2d3449] dark:bg-[#131b2e]" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                        />
                                    </PopoverContent>
                                </Popover>
                            )}
                        />
                    </div>
                    {errors.paidDate?.message&&<p className="text-xs text-red-500 dark:text-[#ffb4ab]">{errors.paidDate.message}</p>}
                    <div className="space-y-1">
                        <label htmlFor="notes" className="text-xs font-semibold text-[#091828] dark:text-white">Notes</label>
                        <input
                            id="notes"
                            {...register("notes")}
                            placeholder="e.g. paid 2 days early"
                            className="w-full rounded-2xl bg-white px-4 py-3.5 text-sm text-[#091828] outline-none placeholder:text-[#9b96a8] dark:bg-[#131b2e] dark:text-white dark:placeholder:text-[#a0aec0]"
                        />
                    </div>
                    {errors.notes?.message&&<p className="text-xs text-red-500 dark:text-[#ffb4ab]">{errors.notes.message}</p>}
                    {submitError&&<p role="alert" className="rounded-2xl bg-[#FFD9E1] px-4 py-3 text-xs font-semibold text-[#AC2A5D] dark:bg-[#93000a]/30 dark:text-[#ffb4ab]">{submitError}</p>}
                    <button
                        type="submit"
                        className="w-full rounded-full bg-[#091828] py-4 text-base font-medium text-white disabled:opacity-50 dark:bg-[#ff6b9d] dark:text-[#650030]"
                        disabled={isSubmitting||submissionBlocked||(occurrencesLoading&&!selectedOccurrence)}
                    >
                        {isSubmitting?"Saving...":"Log Payment"}
                    </button>
                </form>
            </div>
            {showPopup&&(
                <PaymentImpactModal
                    result={paymentResult}
                    onDone={()=>navigate("/")}
                />
            )}
        </div>
    )
}

function PaymentImpactModal({
    result,
    onDone,
}:{
    result:ManualContributionResult|null;
    onDone:()=>void;
}){
    if(!result)return null;
    const settled=result.occurrence.status==='PAID'||result.occurrence.status==='PAID_LATE';
    const currency=result.contribution.currency==='ZAR'?'R':result.contribution.currency;
    const scoreDelta=result.scoreImpact?.delta??0;
    const scoreBefore=result.scoreImpact?.previousScore;
    const scoreAfter=result.scoreImpact?.currentScore;
    const coins=result.rewards?.coinsAwarded??0;
    const xp=result.rewards?.xpAwarded??0;
    const streak=result.rewards?.currentPaymentStreak??0;
    const mood=result.rewards?.mascotMood;
    return(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#091828]/40 px-4 pb-6 dark:bg-black/70">
            <div role="dialog" aria-modal="true" aria-labelledby="contribution-result-title" className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-[#091828] bg-white p-5 shadow-[6px_6px_0_#091828] animate-in fade-in slide-in-from-bottom-5 duration-300 dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[6px_6px_0_#060e20]">
                <div className="flex items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#DCEFE8] dark:bg-[#0f4f42]">
                        <CheckCircle2 className="size-6 text-[#10775F] dark:text-[#5eead4]"/>
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-[#6b6375] dark:text-[#a0aec0]">Payment impact</p>
                        <h2 id="contribution-result-title" className="text-2xl font-extrabold text-[#091828] dark:text-white">
                            {settled?'Payment completed!':'Partial payment recorded!'}
                        </h2>
                        {result.replayed&&(
                            <p className="mt-1 text-xs font-semibold text-[#10775F] dark:text-[#5eead4]">Previously recorded payment confirmed. No new contribution was created.</p>
                        )}
                        {result.scoreImpact?.explanation&&(
                            <p className="mt-1 text-xs font-semibold text-[#6b6375] dark:text-[#a0aec0]">{result.scoreImpact.explanation}</p>
                        )}
                    </div>
                </div>
                <div className="mt-5 space-y-3 rounded-2xl bg-[#F4FBF7] p-4 dark:bg-[#1c263c]">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#6b6375] dark:text-[#a0aec0]">Recorded contribution</p>
                    <p className="text-sm font-bold text-[#091828] dark:text-white">{result.occurrence.obligationName}</p>
                    <div className="flex justify-between gap-3 text-sm text-[#091828] dark:text-white">
                        <span>Amount recorded</span>
                        <span className="font-extrabold">{currency} {result.contribution.amount}</span>
                    </div>
                    <div className="flex justify-between gap-3 text-sm text-[#091828] dark:text-white">
                        <span>Already paid</span>
                        <span className="font-bold">{currency} {result.occurrence.amountPaid}</span>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-[#DCEFE8] pt-3 text-sm text-[#091828] dark:border-[#2d3449] dark:text-white">
                        <span>Remaining balance</span>
                        <span className="font-extrabold text-[#10775F] dark:text-[#5eead4]">{currency} {result.occurrence.amountRemaining}</span>
                    </div>
                    <p className="text-xs text-[#6b6375] dark:text-[#a0aec0]">Paid on {String(result.contribution.paidDate).slice(0,10)} · {result.occurrence.status.replaceAll('_',' ')}</p>
                    <p className="break-all text-[10px] text-[#6b6375] dark:text-[#a0aec0]">Contribution ID: {result.contribution.id}</p>
                </div>
                {result.scoreImpact&&(
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <ImpactStat
                            icon={<TrendingUp className="size-4"/>}
                            label="Score"
                            value={`${scoreDelta>=0?"+":""}${scoreDelta} points`}
                            detail={scoreBefore!==undefined&&scoreAfter!==undefined?`${scoreBefore} -> ${scoreAfter}`:"No change"}
                        />
                    </div>
                )}
                {result.rewards&&(
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <ImpactStat icon={<Coins className="size-4"/>} label="Coins" value={`+${coins}`} detail="Awarded"/>
                        <ImpactStat icon={<Flame className="size-4"/>} label="XP" value={`+${xp}`} detail="Progress gained"/>
                        <ImpactStat icon={<Flame className="size-4"/>} label="Streak" value={`${streak} days`} detail={mood?`Mood: ${mood}`:"Current streak"}/>
                    </div>
                )}
                {result.paymentImpact?.isLate&&(
                    <div className="mt-4 rounded-2xl bg-[#FFD9E1] px-4 py-3 text-xs font-semibold text-[#AC2A5D] dark:bg-[#93000a]/30 dark:text-[#ffb4ab]">
                        This payment was {result.paymentImpact.daysLate} days late.
                    </div>
                )}
                <LongButton
                    LongVariant="primaryDark"
                    type="button"
                    className="mt-5 w-full dark:bg-[#1e293b] dark:hover:bg-[#334155]"
                    onClick={onDone}
                >
                    Back to dashboard
                </LongButton>
            </div>
        </div>
    );
}

function ImpactStat({
    icon,
    label,
    value,
    detail,
}:{
    icon:ReactNode;
    label:string;
    value:string;
    detail:string;
}){
    return(
        <div className="rounded-2xl bg-[#F4FBF7] px-3 py-3 dark:bg-[#1c263c]">
            <div className="mb-2 text-[#AC2A5D]">{icon}</div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#6b6375] dark:text-[#a0aec0]">{label}</p>
            <p className="mt-1 text-base font-extrabold text-[#091828] dark:text-white">{value}</p>
            <p className="mt-0.5 text-[10px] font-semibold text-[#6b6375] dark:text-[#a0aec0]">{detail}</p>
        </div>
    );
}