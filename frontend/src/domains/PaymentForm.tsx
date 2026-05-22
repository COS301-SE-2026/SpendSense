"use client";
import {useState, type ReactNode} from "react";
import {useForm,Controller, type Resolver} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {useLocation,useNavigate} from "react-router-dom";
import {LongButton} from "../components/common/LongButton";
import {CustomInput} from "../components/common/CustomInput";
import {logPayment} from "../features/payments/paymentsApi";
import {Popover,PopoverContent, PopoverTrigger} from "../components/ui/popover";
import {Calendar as CalenderIcon, CheckCircle2, Coins, Flame, TrendingUp} from "lucide-react";
import {IconButton} from "@/components/common/IconButton";
import {Calendar} from "@/components/ui/calendar";

const paymentSchema=z.object({
    occurrenceId:z 
        .string()
        .min(1, "OccurenceID is required."),
    amountPaid: z
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
    const selectedObligation=selectedPayment?.obligation;
    const selectedAmount=Number(selectedOccurrence?.amountDue ?? 0);
    const [showPopup,setShowPopup]=useState(false);
    const [paymentResult,setPaymentResult]=useState<PaymentResult|null>(null);
    const [submitError,setSubmitError]=useState<string|null>(null);
    const [isSubmitting,setSubmitting]=useState(false);
    const{
        register,
        handleSubmit,
        control,
        formState:{errors},
   }=useForm<PaymentFormData>({
        resolver: zodResolver(paymentSchema) as Resolver<PaymentFormData>,
        defaultValues:{
            occurrenceId: selectedOccurrence?.id ?? "",
            amountPaid: selectedAmount,
            paidDate: new Date(),
            notes: ""
       }satisfies PaymentFormData,
   });
    const onSubmit=async (formData:PaymentFormData)=>{
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
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4FBF7] px-4">
            <div className="w-full max-w-sm space-y-5">
                {/* header -> cancel button(IconVariant="iconCancel"),heading*/}
                <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex-shrink-0">
                        <IconButton 
                            type="button" IconVariant="iconCancel"
                            aria-label="Clear form"
                            onClick={()=>navigate("/")}/>    
                    </div>   
                    <h1 className="text-center text-[#091828] text-3xl font-bold">Add Payment</h1>
                    <div className="size-10 flex-shrink-0" aria-hidden="true"/>
                </div>
                {selectedOccurrence && selectedObligation && (
                    <div className="rounded-3xl border-2 border-[#091828] bg-white p-4 shadow-[4px_4px_0_#091828]">
                        <p className="text-xs font-bold uppercase tracking-wide text-[#6b6375]">Selected payment</p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-lg font-extrabold text-[#091828]">{selectedObligation.name}</p>
                                <p className="text-xs font-semibold text-[#6b6375]">{selectedObligation.type} | {selectedOccurrence.status}</p>
                            </div>
                            <p className="text-lg font-extrabold text-[#AC2A5D]">
                                {selectedOccurrence.currency === "ZAR" ? "R" : selectedOccurrence.currency} {selectedAmount.toFixed(2)}
                            </p>
                        </div>
                    </div>
                )}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full">
                    {/* Payment occurrence id - hidden in the normal calendar flow */}
                    {selectedOccurrence ? (
                        <input type="hidden" {...register("occurrenceId")} />
                    ) : (
                        <>
                            <div className="space-y-1">
                                <label htmlFor="occurrenceId" className="text-xs font-semibold text-[#091828]">Occurence id</label>
                                <CustomInput
                                    variant="form"
                                    id="occurrenceId"
                                    {...register("occurrenceId")}
                                    placeholder=""
                                    className="w-full"
                                />
                            </div>
                            {errors.occurrenceId?.message && <p className="text-xs text-red-500">{errors.occurrenceId.message}</p>}
                        </>
                    )}
                    {/* amount paid*/}
                    <div className="space-y-1">
                        <label htmlFor="amountPaid" className="text-xs font-semibold text-[#091828]">Amount paid</label>
                        <CustomInput
                            variant="form"
                            id="amountPaid"
                            {...register("amountPaid")}
                            readOnly={Boolean(selectedOccurrence)}
                            placeholder="R0.00"
                            className="w-full"
                        />
                    </div>
                    {errors.amountPaid?.message && <p className="text-xs text-red-500">{errors.amountPaid.message}</p>}
                    {/* date paid */}
                    <div className="space-y-1">
                        <label htmlFor="paidDate" className="text-xs font-semibold text-[#091828] mb-1">Date paid</label>
                        <Controller
                            control={control}
                            name="paidDate"
                            render={({field})=>(
                                <Popover>
                                <PopoverTrigger asChild>
                                    <LongButton 
                                        LongVariant="form" 
                                        type="button" 
                                        showArrow={false}
                                        className="rounded-lg w-full justify-start text-left font-normal flex items-center"
                                    >
                                    <CalenderIcon className="mr-2 h-4 w-4 text-gray-500" />
                                    {field.value ? (
                                        new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date(field.value))
                                    ) : (
                                        <span className="text-gray-400">Select date</span>
                                    )}
                                    </LongButton>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-white border rounded-md shadow-md" align="start">
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
                    {errors.paidDate?.message && <p className="text-xs text-red-500">{errors.paidDate.message}</p>}       
                    {/* notes */}
                    <div className="space-y-1">
                        <label htmlFor="notes" className="text-xs font-semibold text-[#091828]">Notes</label>
                        <CustomInput
                            variant="form"
                            id="notes"
                            {...register("notes")}
                            placeholder="e.g. paid 2 days early"
                            className="w-full"
                        />
                    </div>
                    {errors.notes?.message && <p className="text-xs text-red-500">{errors.notes.message}</p>}
                    {submitError && <p className="rounded-2xl bg-[#FFD9E1] px-4 py-3 text-xs font-semibold text-[#AC2A5D]">{submitError}</p>}
                    <LongButton 
                        LongVariant="primaryDark" 
                        type="submit" 
                        className="w-full"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Saving..." : "Log Payment"}
                    </LongButton>
                </form>
            </div>
            {showPopup && (
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#091828]/40 px-4 pb-6">
            <div className="w-full max-w-sm rounded-3xl border-2 border-[#091828] bg-white p-5 shadow-[6px_6px_0_#091828] animate-in fade-in slide-in-from-bottom-5 duration-300">
                <div className="flex items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#DCEFE8]">
                        <CheckCircle2 className="size-6 text-[#10775F]"/>
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-[#6b6375]">Payment impact</p>
                        <h2 className="text-2xl font-extrabold text-[#091828]">Payment made!</h2>
                        {result?.scoreImpact?.explanation && (
                            <p className="mt-1 text-xs font-semibold text-[#6b6375]">{result.scoreImpact.explanation}</p>
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

                {result?.paymentImpact?.isLate && (
                    <div className="mt-4 rounded-2xl bg-[#FFD9E1] px-4 py-3 text-xs font-semibold text-[#AC2A5D]">
                        This payment was {result.paymentImpact.daysLate} days late.
                    </div>
                )}

                <LongButton
                    LongVariant="primaryDark"
                    type="button"
                    className="mt-5 w-full"
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
        <div className="rounded-2xl bg-[#F4FBF7] px-3 py-3">
            <div className="mb-2 text-[#AC2A5D]">{icon}</div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#6b6375]">{label}</p>
            <p className="mt-1 text-base font-extrabold text-[#091828]">{value}</p>
            <p className="mt-0.5 text-[10px] font-semibold text-[#6b6375]">{detail}</p>
        </div>
    );
}
