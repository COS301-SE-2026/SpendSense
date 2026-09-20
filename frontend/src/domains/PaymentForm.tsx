
"use client";
import {useState,useEffect,type ReactNode} from "react";
import {useForm,Controller,type Resolver} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {useLocation,useNavigate} from "react-router-dom";
import {LongButton} from "../components/common/LongButton";
import {getUpcomingOccurrences,logPayment} from "../features/payments/paymentsApi";
import type {CalendarOccurrence} from "../hooks/useCalendarOccurrences";
import {Popover,PopoverContent,PopoverTrigger} from "../components/ui/popover";
import {Calendar as CalenderIcon,CheckCircle2,Coins,Flame,TrendingUp,X,Camera,ChevronDown,Check,CreditCard} from "lucide-react";
import {Calendar} from "@/components/ui/calendar";

const paymentSchema=z.object({
    occurrenceId:z
        .string()
        .min(1,"OccurrenceID is required."),
    amountPaid:z
        .coerce.number()
        .positive("Amount must be greater than 0"),
    paidDate:z
        .date({message:"A start date is required."}),
    notes:z
        .string()
        .optional(),
});

type PaymentFormData=z.infer<typeof paymentSchema>;

type PaymentResult={
    scoreImpact?:{
        previousScore:number;
        currentScore:number;
        delta:number;
        explanation:string;
    };
    rewards?:{
        coinsAwarded:number;
        xpAwarded:number;
        currentPaymentStreak:number;
        mascotMood:string;
    };
    paymentImpact?:{
        isLate:boolean;
        daysLate:number;
        simulatedInterest:number|string;
    };
};

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
    const selectedAmount=Number(selectedOccurrence?.amountDue ?? 0);
    const [showPopup,setShowPopup]=useState(false);
    const [paymentResult,setPaymentResult]=useState<PaymentResult|null>(null);
    const [submitError,setSubmitError]=useState<string|null>(null);
    const [isSubmitting,setSubmitting]=useState(false);
    const [occurrences,setOccurrences]=useState<CalendarOccurrence[]>([]);
    const [occurrencesLoading,setOccurrencesLoading]=useState(true);
    const [occurrencesError,setOccurrencesError]=useState<string|null>(null);
    const [isOccurrencePickerOpen,setIsOccurrencePickerOpen]=useState(false);
    const{
        register,
        handleSubmit,
        control,
        getValues,
        formState:{errors},
    }=useForm<PaymentFormData>({
        resolver:zodResolver(paymentSchema) as Resolver<PaymentFormData>,
        defaultValues:{
            occurrenceId:selectedOccurrence?.id ?? fallbackOccurrenceId,
            amountPaid:selectedAmount,
            paidDate:new Date(),
            notes:""
        }satisfies PaymentFormData,
    });

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
        setSubmitting(true);
        setSubmitError(null);
        try{
            const response=await logPayment({
                occurrenceId:selectedOccurrence?.id ?? formData.occurrenceId,
                amountPaid:selectedOccurrence ? selectedAmount : formData.amountPaid,
                paidDate:formData.paidDate.toISOString().split("T")[0],
                notes:formData.notes?.trim() || undefined,
            });
            setPaymentResult((response as {data:PaymentResult}).data);
            setShowPopup(true);
        }catch(error){
            console.error("Failed to log payment: ",error);
            setSubmitError(error instanceof Error ? error.message : "Failed to log payment");
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
                {selectedOccurrence && selectedObligation && (
                    <div className="rounded-3xl border-2 border-[#091828] bg-white p-4 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[4px_4px_0_#060e20]">
                        <p className="text-xs font-bold uppercase tracking-wide text-[#6b6375] dark:text-[#a0aec0]">Selected payment</p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-lg font-extrabold text-[#091828] dark:text-white">{selectedObligation.name}</p>
                                <p className="text-xs font-semibold text-[#6b6375] dark:text-[#a0aec0]">{selectedObligation.type} | {selectedOccurrence.status}</p>
                            </div>
                            <p className="text-lg font-extrabold text-[#AC2A5D] dark:text-[#ff6b9d]">
                                {selectedOccurrence.currency === "ZAR" ? "R" : selectedOccurrence.currency} {selectedAmount.toFixed(2)}
                            </p>
                        </div>
                    </div>
                )}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full">
                    {selectedOccurrence ? (
                        <input type="hidden" {...register("occurrenceId")}/>
                    ) : (
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
                    <div className="space-y-1">
                        <label htmlFor="amountPaid" className="text-xs font-semibold text-[#091828] dark:text-white">Amount paid</label>
                        <input
                            id="amountPaid"
                            {...register("amountPaid")}
                            readOnly={Boolean(selectedOccurrence)}
                            placeholder="R0.00"
                            className="w-full rounded-2xl bg-white px-4 py-3.5 text-sm text-[#091828] outline-none dark:bg-[#131b2e] dark:text-white"
                        />
                    </div>
                    {errors.amountPaid?.message&&<p className="text-xs text-red-500 dark:text-[#ffb4ab]">{errors.amountPaid.message}</p>}
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
                                            {field.value ? (
                                                new Intl.DateTimeFormat('en-US',{dateStyle:'long'}).format(new Date(field.value))
                                            ) : (
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
                    {submitError&&<p className="rounded-2xl bg-[#FFD9E1] px-4 py-3 text-xs font-semibold text-[#AC2A5D] dark:bg-[#93000a]/30 dark:text-[#ffb4ab]">{submitError}</p>}
                    <button
                        type="submit"
                        className="w-full rounded-full bg-[#091828] py-4 text-base font-medium text-white disabled:opacity-50 dark:bg-[#ff6b9d] dark:text-[#650030]"
                        disabled={isSubmitting||(occurrencesLoading&&!selectedOccurrence)}
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
    result:PaymentResult|null;
    onDone:()=>void;
}){
    const scoreDelta=result?.scoreImpact?.delta ?? 0;
    const scoreBefore=result?.scoreImpact?.previousScore;
    const scoreAfter=result?.scoreImpact?.currentScore;
    const coins=result?.rewards?.coinsAwarded ?? 0;
    const xp=result?.rewards?.xpAwarded ?? 10;
    const streak=result?.rewards?.currentPaymentStreak ?? 0;
    const mood=result?.rewards?.mascotMood;

    return(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#091828]/40 px-4 pb-6 dark:bg-black/70">
            <div className="w-full max-w-sm rounded-3xl border-2 border-[#091828] bg-white p-5 shadow-[6px_6px_0_#091828] animate-in fade-in slide-in-from-bottom-5 duration-300 dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[6px_6px_0_#060e20]">
                <div className="flex items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#DCEFE8] dark:bg-[#0f4f42]">
                        <CheckCircle2 className="size-6 text-[#10775F] dark:text-[#5eead4]"/>
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-[#6b6375] dark:text-[#a0aec0]">Payment impact</p>
                        <h2 className="text-2xl font-extrabold text-[#091828] dark:text-white">Payment made!</h2>
                        {result?.scoreImpact?.explanation&&(
                            <p className="mt-1 text-xs font-semibold text-[#6b6375] dark:text-[#a0aec0]">{result.scoreImpact.explanation}</p>
                        )}
                    </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                    <ImpactStat
                        icon={<TrendingUp className="size-4"/>}
                        label="Score"
                        value={`${scoreDelta >= 0 ? "+" : ""}${scoreDelta} points`}
                        detail={scoreBefore !== undefined && scoreAfter !== undefined ? `${scoreBefore} -> ${scoreAfter}` : "Updated"}
                    />
                    <ImpactStat
                        icon={<Coins className="size-4"/>}
                        label="Coins"
                        value={`+${coins}`}
                        detail="Awarded"
                    />
                    <ImpactStat
                        icon={<Flame className="size-4"/>}
                        label="XP"
                        value={`+${xp}`}
                        detail="Progress gained"
                    />
                    <ImpactStat
                        icon={<Flame className="size-4"/>}
                        label="Streak"
                        value={`${streak} days`}
                        detail={mood ? `Mood: ${mood}` : "Current streak"}
                    />
                </div>
                {result?.paymentImpact?.isLate&&(
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