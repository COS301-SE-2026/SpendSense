"use client";
import {useState} from "react";
import {useForm,Controller, type Resolver} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {useNavigate} from "react-router-dom";
import {LongButton} from "../components/common/LongButton";
import {CustomInput} from "../components/common/CustomInput";
// import {logPayment} from "../features/payments/paymentsApi"; //mocked for now
import {Popover,PopoverContent, PopoverTrigger} from "../components/ui/popover";
import {Calendar as CalenderIcon} from "lucide-react";
import {IconButton} from "@/components/common/IconButton";
import {Calendar} from "@/components/ui/calendar";
import { CustomBadge } from "@/components/common/CustomBadges";

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

export default function ObligationForm(){
    const navigate=useNavigate();
    const [showPopup,setShowPopup]=useState(false);
    const [isSubmitting,setSubmitting]=useState(false);
    const{
        register,
        handleSubmit,
        control,
        reset,
        formState:{errors},
   }=useForm<PaymentFormData>({
        resolver: zodResolver(paymentSchema) as Resolver<PaymentFormData>,
        defaultValues:{
            occurrenceId: "",
            amountPaid: 0,
            paidDate: new Date(),
            notes: ""
       }satisfies PaymentFormData,
   });
    const onSubmit=async (formData:PaymentFormData)=>{
        setSubmitting(true);
        try{
            console.log("Mock payment logged successfully: ",formData);
            setShowPopup(true);
            setTimeout(()=>{
                setShowPopup(false);
                reset();
            },5000);
       }catch(error){
            console.error("Failed to create obligation: ",error);
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
                    <div className="flex-shrink-0">
                        <IconButton type="button" IconVariant="iconRefresh" onClick={()=>reset()}/>
                    </div>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full">
                    {/* Payment obligation id  */}
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
                    {/* amount paid*/}
                    <div className="space-y-1">
                        <label htmlFor="amountPaid" className="text-xs font-semibold text-[#091828]">Amount paid</label>
                        <CustomInput
                            variant="form"
                            id="amountPaid"
                            {...register("amountPaid")}
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
                <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50 bg-[#FF6B9D] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-[#091828] animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold">Payment made!</span>
                        <CustomBadge variant="xp">+10 xp</CustomBadge>
                    </div>
                </div>
            )}
        </div>
    )
}