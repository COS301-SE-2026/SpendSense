"use client";
import {useEffect, useState} from "react";
import {useForm,Controller,useWatch, type Resolver} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {useNavigate} from "react-router-dom";
import {LongButton} from "../components/common/LongButton";
import {CustomInput} from "../components/common/CustomInput";
import {createObligation} from "../features/obligations/obligationsApi";
import {getCategories, type Category} from "../features/categories/categoriesApi";
import {Popover,PopoverContent, PopoverTrigger} from "../components/ui/popover";
import {Calendar as CalenderIcon} from "lucide-react";
import {IconButton} from "@/components/common/IconButton";
import {Calendar} from "@/components/ui/calendar";
import { CustomBadge } from "@/components/common/CustomBadges";

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
                .enum(['ONCE', 'WEEKLY', 'MONTHLY', 'FIXED_INSTALLMENT']),
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
                .array(z.enum(["IN_APP","EMAIL","PUSH","SMS"])),
       })
        .optional()
});

type ObligationFormData=z.infer<typeof obligationSchema>;

export default function ObligationForm(){
    const navigate=useNavigate();
    const [showPopup,setShowPopup]=useState(false);
    const [isSubmitting,setSubmitting]=useState(false);
    const [categories,setCategories]=useState<Category[]>([]);
    const [isLoadingCategories,setLoadingCategories]=useState(true);
    const [categoryLoadError,setCategoryLoadError]=useState<string | null>(null);
    const [submitError,setSubmitError]=useState<string | null>(null);
    const{
        register,
        handleSubmit,
        control,
        setError,
        reset,
        formState:{errors},
   }=useForm<ObligationFormData>({
        resolver: zodResolver(obligationSchema) as Resolver<ObligationFormData>,
        defaultValues:{
            name:"",
            description:"",
            categoryId:"",
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
                daysBefore:[3,1],
                channels:["IN_APP"],
           }
       }satisfies ObligationFormData,
   });
    const remindersEnabled=useWatch({control,name:"reminders.enabled"});

    useEffect(()=>{
        let isMounted=true;

        async function loadCategories(){
            setLoadingCategories(true);
            setCategoryLoadError(null);

            try{
                const response=await getCategories("OBLIGATION");
                if(isMounted){
                    setCategories(response.data);
                }
            }catch(error){
                if(isMounted){
                    console.error("Failed to load obligation categories: ",error);
                    setCategoryLoadError("Could not load categories. Please try again.");
                }
            }finally{
                if(isMounted){
                    setLoadingCategories(false);
                }
            }
        }

        void loadCategories();

        return ()=>{
            isMounted=false;
        };
    },[]);

    const onSubmit=async (formData:ObligationFormData)=>{
        const data=formData as ObligationFormData;
        setSubmitting(true);
        setSubmitError(null);
        try{
            const isFixedInstallment=data.schedule.frequency==="FIXED_INSTALLMENT";
            const totalOccurrences=data.schedule.totalOccurrences;

            if(isFixedInstallment && (!totalOccurrences || totalOccurrences < 1)){
                setError("schedule.totalOccurrences",{
                    type:"manual",
                    message:"Total occurrences is required for fixed installments",
                });
                return;
            }

            const dayOfMonth=Math.min(data.startDate.getDate(),28);
            const payload={
                name:data.name,
                description:data.description,
                type:data.type,
                categoryId:data.categoryId,
                amount:data.amount,
                currency:data.currency,
                priority:data.priority,
                startDate:formatDateForApi(data.startDate),
                endDate:data.endDate ? formatDateForApi(data.endDate) : null,
                schedule:{
                    frequency:data.schedule.frequency,
                    interval:data.schedule.interval,
                    dayOfMonth:
                        data.schedule.frequency==="MONTHLY" || isFixedInstallment
                            ? dayOfMonth
                            : undefined,
                    totalOccurrences:isFixedInstallment ? totalOccurrences : null,
                },
                reminders:data.reminders?.enabled
                    ? {
                        enabled:true,
                        daysBefore:data.reminders.daysBefore,
                        channels:data.reminders.channels,
                    }
                    : {
                        enabled:false,
                        daysBefore:[],
                        channels:["IN_APP" as const],
                    },
            };
            await createObligation(payload);
            setShowPopup(true);
            setTimeout(()=>{
                setShowPopup(false);
                reset();
            },5000);
       }catch(error){
            console.error("Failed to create obligation: ",error);
            setSubmitError("Could not create obligation. Please check the form and try again.");
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
    //}
    // reminders?: {enabled: boolean; daysBefore: number[]; channels: string[]}
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
                    <h1 className="text-center text-[#091828] text-3xl font-bold">New obligation</h1>
                    <div className="flex-shrink-0">
                        <IconButton type="button" IconVariant="iconRefresh" onClick={()=>reset()}/>
                    </div>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full">
                    {/* What is this for-input InputVariant="form" */}
                    <div className="space-y-1">
                        <label htmlFor="name" className="text-xs font-semibold text-[#091828]">What is this for?</label>
                        <CustomInput
                            variant="form"
                            id="name"
                            {...register("name")}
                            placeholder="e.g. Netflix Subscription"
                            className="w-full"
                        />
                    </div>
                    {errors.name?.message && <p className="text-xs text-red-500">{errors.name.message}</p>}
                    {/* description */}
                    <div className="space-y-1">
                        <label htmlFor="description" className="text-xs font-semibold text-[#091828]">Description</label>
                        <CustomInput
                            variant="form"
                            id="description"
                            {...register("description")}
                            placeholder="Optional notes"
                            className="w-full"
                        />
                    </div>
                    {errors.description?.message && <p className="text-xs text-red-500">{errors.description.message}</p>}
                    {/* type-dropdown e.g. subscription */}
                    <div className="space-y-1">
                        <label htmlFor="type" className="text-xs font-semibold text-[#091828]">Type</label>
                        <select
                        id="type"
                        {...register("type")}
                        className="h-12 px-6 text-sm w-full bg-white text-[#787A80] shadow-[0_0_15px_rgba(72,187,120,0.3)] border-none rounded-lg transition-shadow focus:shadow-md"
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
                        <label htmlFor="categoryId" className="text-xs font-semibold text-[#091828]">Category</label>
                        <select
                            id="categoryId"
                            {...register("categoryId")}
                            disabled={isLoadingCategories || Boolean(categoryLoadError)}
                            className="h-12 px-6 text-sm w-full bg-white text-[#787A80] shadow-[0_0_15px_rgba(72,187,120,0.3)] border-none rounded-lg transition-shadow focus:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            <option value="">
                                {isLoadingCategories ? "Loading categories..." : "Select a category"}
                            </option>
                            {categories.map((category)=>(
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    {errors.categoryId?.message && <p className="text-xs text-red-500">{errors.categoryId.message}</p>}
                    {categoryLoadError && <p className="text-xs text-red-500">{categoryLoadError}</p>}
                    {/* amount -input InputVariant="form"*/}
                    <div className="space-y-1">
                        <label htmlFor="amount" className="text-xs font-semibold text-[#091828]">Amount</label>
                        <CustomInput
                            variant="form"
                            id="amount"
                            {...register("amount")}
                            placeholder="R0.00"
                            className="w-full"
                        />
                    </div>
                    {errors.amount?.message && <p className="text-xs text-red-500">{errors.amount.message}</p>}
                    {/* priority default to med */}
                    <div className="space-y-1">
                        <label htmlFor="priority" className="text-xs font-semibold text-[#091828]">Priority</label>
                        <select
                        id="priority"
                        {...register("priority")}
                        className="h-12 px-6 text-sm w-full bg-white text-[#787A80] shadow-[0_0_15px_rgba(72,187,120,0.3)] border-none rounded-lg transition-shadow focus:shadow-md"
                        >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="CRITICAL">Critical</option>
                        </select>
                    </div>
                    {errors.priority?.message && <p className="text-xs text-red-500">{errors.priority.message}</p>}
                    <div className="flex items-center gap-5 mb-2">
                            {/* start date-calender input */}
                        <div className="space-y-1">
                            <label htmlFor="startDate" className="text-xs font-semibold text-[#091828] mb-1">Due date</label>
                            <Controller
                                control={control}
                                name="startDate"
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
                                                    <span className="text-gray-400">Start Date</span>
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
                            <label htmlFor="endDate" className="text-xs font-semibold text-[#091828] mb-1">End date</label>
                            <Controller
                                control={control}
                                name="endDate"
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
                                                <span className="text-gray-400">End Date</span>
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
                    </div>
                    {/* frequency-dropdown('ONCE' | 'WEEKLY' | 'MONTHLY' | 'FIXED_INSTALLMENTS') */}
                    <div className="space-y-1">
                        <label htmlFor="frequency" className="text-xs font-semibold text-[#091828]">Frequency</label>
                        <select
                        id="frequency"
                        {...register("schedule.frequency")}
                        className="h-12 px-6 text-sm w-full bg-white text-[#787A80] shadow-[0_0_15px_rgba(72,187,120,0.3)] border-none rounded-lg transition-shadow focus:shadow-md"
                        >
                            <option value="ONCE">Once off</option>
                            <option value="WEEKLY">Weekly</option>
                            <option value="MONTHLY">Monthly</option>
                            <option value="FIXED_INSTALLMENT">Fixed Installments</option>
                        </select>
                    </div>
                    {errors.schedule?.frequency?.message && <p className="text-xs text-red-500">{errors.schedule?.frequency.message}</p>}
                    {/* Total occurences - number of payments */}
                    <div className="space-y-1">
                        <label htmlFor="totalOccurrences" className="text-xs font-semibold text-[#091828]">Total occurences</label>
                        <CustomInput
                            variant="form"
                            id="totalOccurrences"
                            {...register("schedule.totalOccurrences")}
                            placeholder="32"
                            className="w-full"
                        />
                    </div>
                    {errors.schedule?.totalOccurrences?.message && <p className="text-xs text-red-500">{errors.schedule?.totalOccurrences.message}</p>}
                    {/* notifucations opt in - default to email if so for now */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between bg-white shadow-[0_0_15px_rgba(72,187,120,0.15)] p-3 rounded-xl border border-gray-100">
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-[#091828]">
                                    Reminders
                                </span>
                                <span className="text-xs text-[#787A80]">Get notified before this payment is due</span>
                            </div>
                            <Controller
                                control={control}
                                name="reminders.enabled"
                                render={({field})=>(
                                    <div 
                                        onClick={()=>field.onChange(!field.value)}
                                        className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors duration-200 focus:outline-none ${
                                            field.value ? 'bg-[#FF6B9D]' : 'bg-[#DDE4E0]'
                                       }`}
                                    >
                                        <div className={`absolute top-[2px] left-[2px] bg-white border border-[#DDE4E0] rounded-full h-5 w-5 transition-transform duration-200 ease-in-out ${
                                            field.value ? 'translate-x-5' : 'translate-x-0'
                                       }`} />
                                    </div>
                                )}
                            />
                        </div>
                        {remindersEnabled ? (
                            <div className="bg-white/50 border border-dashed border-[#DDE4E0] rounded-xl p-3 text-xs text-[#091828] flex items-center justify-between animate-fadeIn">
                                <span>Notification Channels:</span>
                                <div className="flex gap-1">
                                    <span className="bg-[#E8F8F0] text-[#2F855A] font-medium px-2 py-0.5 rounded text-[10px]">
                                        IN_APP
                                    </span>
                                </div>
                            </div>
                        ) : null}
                    </div>
                    <LongButton 
                        LongVariant="primaryDark" 
                        type="submit" 
                        className="w-full"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Saving..." : "Log Obligation"}
                    </LongButton>
                    {submitError && <p className="text-center text-xs text-red-500">{submitError}</p>}
                </form>
            </div>
            {showPopup && (
                <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50 bg-[#FF6B9D] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-[#091828] animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold">Added new obligation!</span>
                        <CustomBadge variant="xp">+10 xp</CustomBadge>
                    </div>
                </div>
            )}
        </div>
    )
}

function formatDateForApi(date:Date){
    const year=date.getFullYear();
    const month=String(date.getMonth()+1).padStart(2,"0");
    const day=String(date.getDate()).padStart(2,"0");

    return `${year}-${month}-${day}`;
}
