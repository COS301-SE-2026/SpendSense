"use client";
import {useState} from "react";
import {useForm,Controller,type Resolver} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {format} from "date-fns";
import * as z from "zod";
import { Link, useNavigate} from "react-router-dom";
import { LongButton } from "../components/common/LongButton";
import { CustomInput } from "../components/common/CustomInput";
import {createObligation} from "../features/obligations/obligationsApi";
import { Popover,PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Calendar as CalenderIcon } from "lucide-react";
import { IconButton } from "@/components/common/IconButton";
import { Calendar } from "@/components/ui/calendar";

const obligationSchema=z.object({
    name:z
        .string()
        .min(1, "Name is required"),
    description:z
        .string()
        .optional(),
    type:z
        .enum(['RENT','SUBSCRIPTION', 'BNPL', 'UTILITY','IOU', 'CUSTOM']),
    categoryId:z 
        .string()
        .min(1,"Category is required"),
    amount:z
        .coerce.number()
        .positive("Amount must be greater than R0.00"),
    currency:z
        .string()
        .default("ZAR"),
    priority:z
        .enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
        .default('MEDIUM'),
    startDate:z
        .date({message:"A start date is required."}),
    endDate:z
        .date()
        .nullable()
        .optional(),
    schedule:z
        .object({
            frequency:z
                .enum(['ONCE', 'WEEKLY', 'MONTHLY', 'FIXED_INSTALLMENTS']),
            interval: z
                .coerce.number()
                .default(1),
            dayOfMonth: z
                .coerce.number()
                .optional(),
            totalOccurrences: z
                .coerce.number()
                .nullable()
                .optional()
        }),
    reminders: z
        .object({
            enabled: z
                .boolean(),
            daysBefore: z
                .array(z.number()),
            channels:z
                .array(z.string()),
        })
        .optional()
});

type ObligationFormData=z.infer<typeof obligationSchema>;

export default function ObligationForm(){
    const navigate=useNavigate();
    const [isSubmitting,setSubmitting]=useState(false);
    const{
        register,
        handleSubmit,
        control,
        formState:{errors},
    }=useForm<ObligationFormData>({
        resolver: zodResolver(obligationSchema) as Resolver<ObligationFormData>,
        defaultValues:{
            name:"",
            description:"",
            categoryId:"Netflix",
            currency:"ZAR",
            priority:"MEDIUM",
            type:"SUBSCRIPTION",
            amount:0,
            startDate: new Date(),
            endDate:null,
            schedule:{
                frequency:"MONTHLY",
                interval:1,
                totalOccurrences:null,
            },
            reminders:{
                enabled:true,
                daysBefore:[1],
                channels:["EMAIL"],
            }
        }satisfies ObligationFormData,
    });
    const onSubmit=async (formData:any)=>{
        const data=formData as ObligationFormData;
        setSubmitting(true);
        try{
            const payload={
                ...data,
                startDate:data.startDate.toISOString(),
                endDate:data.endDate ? data.endDate.toISOString() : null,
            };
            await createObligation(payload);
            //popup
        }catch(error){
            console.error("Failed to create obligation: ",error);
        }finally{
            setSubmitting(false);
        }
    }
    return(
    // name: string
    // description?: string
    // type: 'RENT' | 'SUBSCRIPTION' | 'BNPL' | 'UTILITY' | 'IOU' | 'CUSTOM'
    // categoryId: string
    // amount: number
    // currency: string
    // priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    // startDate: string
    // endDate?: string | null
    // schedule:{
    //     frequency: 'ONCE' | 'WEEKLY' | 'MONTHLY' | 'FIXED_INSTALLMENTS'
    //     interval: number
    //     dayOfMonth?: number
    //     totalOccurrences?: number | null
    // }
    // reminders?: {enabled: boolean; daysBefore: number[]; channels: string[]}
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4FBF7] px-4">
            <div className="w-full max-w-sm space-y-5">
                {/* header -> cancel button(IconVariant="iconCancel"),heading*/}
                <div>
                    <IconButton IconVariant="iconCancel"/>
                    <h1 className="text-[#091828] text-3xl font-bold">New obligation</h1>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* What is this for-input InputVariant="form" */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#091828]">What is this for?</label>
                        <CustomInput
                            variant="form"
                            {...register("name")}
                            placeholder="e.g. Netflix Subscription"
                            className="w-full"
                        />
                    </div>
                    {errors.name?.message && <p className="text-xs text-red-500">{errors.name.message}</p>}
                    {/* description */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#091828]">Description</label>
                        <CustomInput
                            variant="form"
                            {...register("description")}
                            placeholder="Optional notes"
                            className="w-full"
                        />
                    </div>
                    {errors.description?.message && <p className="text-xs text-red-500">{errors.description.message}</p>}
                    {/* type-dropdown e.g. subscription */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#091828]">Type</label>
                        <select
                        {...register("type")}
                        className="bg-white text-[#787A80] shadow-[0_0_15px_rgba(72,187,120,0.3)] border-none"
                        >
                        <option value="SUBSCRIPTION">Subscription</option>
                        <option value="RENT">Rent</option>
                        <option value="BNPL">Buy Now Pay Later (BNPL)</option>
                        <option value="UTILITY">Utility</option>
                        <option value="IOU">IOU</option>
                        <option value="CUSTOM">Custom</option>
                        </select>
                    </div>
                    {errors.type?.message && <p className="text-xs text-red-500">{errors.type.message}</p>}
                    {/* category e.g. Netflix category is the specialisation of type */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#091828]">Category</label>
                        <CustomInput
                            variant="form"
                            {...register("categoryId")}
                            placeholder="e.g. Netflix"
                            className="w-full"
                        />
                    </div>
                    {errors.categoryId?.message && <p className="text-xs text-red-500">{errors.categoryId.message}</p>}
                    {/* amount -input InputVariant="form"*/}
                    <div>
                        <label className="text-xs font-semibold text-[#091828]">Amount</label>
                        <CustomInput
                            variant="form"
                            {...register("amount")}
                            placeholder="R0.00"
                            className="w-full"
                        />
                    </div>
                    {errors.amount?.message && <p className="text-xs text-red-500">{errors.amount.message}</p>}
                    {/* priority default to med */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#091828]">Priority</label>
                        <select
                        {...register("priority")}
                        className="bg-white text-[#787A80] shadow-[0_0_15px_rgba(72,187,120,0.3)] border-none"
                        >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="CRITICAL">Critical</option>
                        </select>
                    </div>
                    {errors.priority?.message && <p className="text-xs text-red-500">{errors.priority.message}</p>}
                    {/* start date-calender input */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#091828] mb-1">Due date</label>
                        <Controller
                            control={control}
                            name="startDate"
                            render={({ field }) => (
                                <Popover>
                                <PopoverTrigger asChild>
                                    <LongButton 
                                        LongVariant="form" 
                                        type="button" 
                                        className="w-full justify-start text-left font-normal flex items-center"
                                    >
                                    <CalenderIcon className="mr-2 h-4 w-4 text-gray-500" />
                                    {field.value ? (
                                        format(field.value, "PPP")
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
                    {errors.startDate?.message && <p className="text-xs text-red-500">{errors.startDate.message}</p>}
                    {/* end date */}
                    <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#091828] mb-1">End date</label>
                        <Controller
                            control={control}
                            name="endDate"
                            render={({ field }) => (
                                <Popover>
                                <PopoverTrigger asChild>
                                    <LongButton 
                                        LongVariant="form" 
                                        type="button" 
                                        className="w-full justify-start text-left font-normal flex items-center"
                                    >
                                    <CalenderIcon className="mr-2 h-4 w-4 text-gray-500" />
                                    {field.value ? (
                                        format(field.value, "PPP")
                                    ) : (
                                        <span className="text-gray-400">Select date</span>
                                    )}
                                    </LongButton>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-white border rounded-md shadow-md" align="start">
                                    <Calendar
                                    mode="single"
                                    selected={field.value || undefined}
                                    onSelect={field.onChange}
                                    />
                                </PopoverContent>
                                </Popover>
                            )}
                        />
                    </div>
                    {errors.endDate?.message && <p className="text-xs text-red-500">{errors.endDate.message}</p>}
                    {/* frequency-dropdown('ONCE' | 'WEEKLY' | 'MONTHLY' | 'FIXED_INSTALLMENTS') */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#091828]">Frequency</label>
                        <select
                        {...register("schedule.frequency")}
                        className="bg-white text-[#787A80] shadow-[0_0_15px_rgba(72,187,120,0.3)] border-none"
                        >
                            <option value="ONCE">Once off</option>
                            <option value="WEEKLY">Weekly</option>
                            <option value="MONTHLY">Monthly</option>
                            <option value="FIXED_INSTALLMENTS">Fixed Installments</option>
                        </select>
                    </div>
                    {errors.schedule?.frequency?.message && <p className="text-xs text-red-500">{errors.schedule?.frequency.message}</p>}
                    {/* Total occurences - number of payments */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#091828]">Total occurences</label>
                        <CustomInput
                            variant="form"
                            {...register("schedule.totalOccurrences")}
                            placeholder="32"
                            className="w-full"
                        />
                    </div>
                    {errors.schedule?.totalOccurrences?.message && <p className="text-xs text-red-500">{errors.schedule?.totalOccurrences.message}</p>}
                    <LongButton 
                        LongVariant="primaryDark" 
                        type="submit" 
                        className="w-full"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Saving..." : "Log Obligation"}
                    </LongButton>
                </form>
            </div>
        </div>
    )
}