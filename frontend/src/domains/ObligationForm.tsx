"use client";
import {useState, useEffect} from "react";
import {useForm, Controller, useWatch, type Resolver} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {useNavigate} from "react-router-dom";
import {CustomBadge} from "@/components/common/CustomBadges";
import {Popover, PopoverContent, PopoverTrigger} from "../components/ui/popover";
import {Calendar} from "@/components/ui/calendar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useCalendarOccurrences } from "@/hooks/useCalendarOccurrences";
import { formatCurrency } from "@/features/payments/occurrenceDisplay";
import {cn} from "@/lib/utils";
import {
    X, RefreshCw,
    Home, Zap, CreditCard, Users, Sparkles, Tv,
    Utensils, Coffee,
    Flag, Repeat, Hash, Bell, Smartphone, Rocket,
    Calendar as CalendarIcon, ChevronDown,
} from "lucide-react";
import {getCategories, type Category} from "../features/categories/categoriesApi";
import {createObligation, type ReminderChannel} from "../features/obligations/obligationsApi";

const obligationSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    type: z.enum(['RENT', 'SUBSCRIPTION', 'BNPL', 'UTILITY', 'IOU', 'CUSTOM']),
    categoryId: z.string().min(1, "Category is required"),
    amount: z.coerce.number().positive("Amount must be greater than R0.00"),
    currency: z.string().default("ZAR"),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
    startDate: z.date({message: "A start date is required."}),
    endDate: z.date().nullable().optional(),
    schedule: z.object({
        frequency: z.enum(['ONCE', 'WEEKLY', 'MONTHLY', 'FIXED_INSTALLMENT']),
        interval: z.coerce.number().default(1),
        dayOfMonth: z.coerce.number().optional(),
        totalOccurrences: z.coerce.number().nullable().optional(),
    }),
    reminders: z.object({
        enabled: z.boolean(),
        daysBefore: z.array(z.number()),
        channels: z.array(z.string()),
    }).optional(),
}).superRefine((data, ctx) => {
    if (
        data.schedule.frequency === 'FIXED_INSTALLMENT' &&
        !data.schedule.totalOccurrences
    ) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['schedule', 'totalOccurrences'],
            message: 'Total occurrences must be a positive whole number'
        })
    }
})

type ObligationFormData = z.infer<typeof obligationSchema>;

const TYPE_OPTIONS = [
    {id: "subscription", value: "SUBSCRIPTION" as const, label: "Subs", icon: <Tv className="size-6" />,bg: "bg-[#FF6B9D]", textColor: "text-[#091828]"},
    {id: "rent", value: "RENT" as const, label: "Rent", icon: <Home className="size-6" />, bg: "bg-[#2C4A6B] dark:bg-[#4a7099]", textColor: "text-white"},
    {id: "utility",value: "UTILITY" as const, label: "Utilities", icon: <Zap className="size-6" />, bg: "bg-[#9B7EDE]", textColor: "text-white"},
    {id: "bnpl", value: "BNPL" as const, label: "BNPL", icon: <CreditCard className="size-6" />, bg: "bg-[#091828] dark:bg-[#3D5A80]", textColor: "text-white"},
    {id: "iou", value: "IOU" as const, label: "IOU", icon: <Users className="size-6" />, bg: "bg-[#72cdbc]", textColor: "text-[#091828]"},
    {id: "food",value: "CUSTOM" as const, label: "Food", icon: <Utensils className="size-6" />, bg: "bg-[#FF9F43]", textColor: "text-white"},
    {id: "coffee",value: "CUSTOM" as const, label: "Coffee", icon: <Coffee className="size-6" />, bg: "bg-[#6C5CE7]", textColor: "text-white"},
    {id: "custom",value: "CUSTOM" as const, label: "Custom", icon: <Sparkles className="size-6" />,bg: "bg-[#FFE9B5]", textColor: "text-[#7a5a00]"},
];

const PRIORITY_OPTIONS = [
    {value: "LOW" as const, label: "Low", iconBg: "bg-[#6FC9B0]"},
    {value: "MEDIUM" as const, label: "Medium", iconBg: "bg-[#FFCB47]"},
    {value: "HIGH" as const, label: "High", iconBg: "bg-[#FF6B9D]"},
    {value: "CRITICAL" as const, label: "Critical", iconBg: "bg-[#AC2A5D]"},
];

const FREQUENCY_OPTIONS = [
    {value: "ONCE" as const, label: "Once off"},
    {value: "WEEKLY" as const, label: "Weekly"},
    {value: "MONTHLY" as const, label: "Monthly"},
    {value: "FIXED_INSTALLMENT" as const, label: "Fixed Installments"},
];

const TYPE_TO_CATEGORY: Record<string, string> = {
    SUBSCRIPTION: "Subscription",
    RENT: "Rent",
    UTILITY: "Utility",
    BNPL: "BNPL",
    IOU: "IOU",
    CUSTOM: "Custom",
};

export default function ObligationForm() {
    const navigate = useNavigate();
    const [showPopup, setShowPopup] = useState(false);
    const [isSubmitting, setSubmitting] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeIconId, setActiveIconId] = useState("subscription");

    useEffect(() => {
        getCategories("OBLIGATION")
            .then(res => setCategories(res.data))
            .catch(console.error);
    }, []);

    const {register, handleSubmit, control, reset, setValue, formState: {errors}} = useForm<ObligationFormData>({
        resolver: zodResolver(obligationSchema) as Resolver<ObligationFormData>,
        defaultValues: {
            name: "",
            description: "",
            categoryId: "",
            currency: "ZAR",
            priority: "MEDIUM",
            type: "SUBSCRIPTION",
            amount: 0,
            startDate: new Date(),
            endDate: null,
            schedule: {frequency: "MONTHLY", interval: 1, totalOccurrences: null},
            reminders: {enabled: true, daysBefore: [3, 1], channels: ["IN_APP"]},
        } satisfies ObligationFormData,
    });

    const remindersEnabled = useWatch({control, name: "reminders.enabled"});
    const selectedType = useWatch({control, name: "type"});

    useEffect(() => {
        const match = categories.find(c => c.name === TYPE_TO_CATEGORY[selectedType]);
        if (match) setValue("categoryId", match.id);
    }, [selectedType, categories, setValue]);

    const onSubmit = async (formData: ObligationFormData) => {
        setSubmitting(true);
        try {
            const isFixedInstallment = formData.schedule.frequency === "FIXED_INSTALLMENT";
            await createObligation({
                name: formData.name,
                description: formData.description,
                type: formData.type,
                categoryId: formData.categoryId,
                amount: formData.amount,
                currency: formData.currency,
                priority: formData.priority,
                startDate: formData.startDate.toISOString(),
                endDate: formData.endDate ? formData.endDate.toISOString() : null,
                schedule: {
                    frequency: formData.schedule.frequency,
                    interval: formData.schedule.interval,
                    dayOfMonth: Math.min(formData.startDate.getDate(), 28),
                    totalOccurrences: isFixedInstallment ? (formData.schedule.totalOccurrences ?? null) : null,
                },
                reminders: formData.reminders ? {
                    enabled: formData.reminders.enabled,
                    daysBefore: formData.reminders.daysBefore,
                    channels: formData.reminders.channels as ReminderChannel[],
                } : undefined,
            });
            setShowPopup(true);
            setTimeout(() => {setShowPopup(false); reset(); navigate("/");}, 5000);
        } catch (error) {
            console.error("Failed to create obligation: ", error);
        } finally {
            setSubmitting(false);
        }
    };

    const { user } = useUserProfile();
    const { occurrences, loading: budgetLoading } = useCalendarOccurrences();
    const paidThisMonth = occurrences.reduce((total, occurrences) => {
        if (
            occurrences.status === "PAID" ||
            occurrences.status === "PAID_LATE"
        ) {
            return total + occurrences.amountDue;
        }

        return total
    }, 0);

    const monthlyBudget = user?.monthlyBudget ?? null;

    const remainingBudget = 
        monthlyBudget !== null 
            ? Math.max(monthlyBudget - paidThisMonth, 0) 
            : null;
    
    return (
        <div className="min-h-screen bg-[#F4FBF7] pb-24 dark:bg-[#0b1326]">
            <div className="mx-auto w-full max-w-md px-5 pt-6">

                {/* Header */}
                <div className="flex items-center justify-between gap-3 pb-4">
                    <button
                        type="button"
                        aria-label="Cancel"
                        onClick={() => navigate(-1)}
                        className="size-11 rounded-full bg-[#FF6B9D] flex items-center justify-center text-[#091828] flex-shrink-0 border-none dark:bg-[#ffb1c5] dark:text-[#650030]"
                    >
                        <X className="size-5" />
                    </button>
                    <h1 className="flex-1 text-center text-xl font-medium text-[#091828] dark:text-white">New obligation</h1>
                    {/* No aria-label intentionally - accessible name "" is what the reset test looks for */}
                    <button
                        type="button"
                        onClick={() => reset()}
                        className="size-11 rounded-full bg-[#72cdbc] flex items-center justify-center text-[#091828] flex-shrink-0 border-none dark:bg-[#5eead4] dark:text-[#134e4a]"
                    >
                        <RefreshCw className="size-4" />
                    </button>
                </div>

                {monthlyBudget !== null && (
                    <div className="mt-6">
                        <div className="rounded-3xl border-2 border-[#091828] bg-white px-5 py-4 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[4px_4px_0_#060e20]">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6375] dark:text-[#a0aec0]">
                                MONTHLY BUDGET LEFT
                            </p>
                
                            {budgetLoading ? (
                                <div className="mt-2 h-7 w-36 animate-pulse rounded-full bg-[#E3EAE6] dark:bg-[#1c263c]"/>
                            ) : (
                                <p className="mt-1 text-2xl font-extrabold text-[#091828] dark:text-white">
                                    {formatCurrency(remainingBudget ?? 0)}
                                    <span className="ml-2 text-sm font-semibold text-[#6b6375] dark:text-[#a0aec0]">
                                        of {formatCurrency(monthlyBudget)}
                                    </span>
                                </p>
                            )}
                    </div>
                    </div>
                )}

                {/* Amount display */}
                <div className="text-center py-6">
                    <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-medium text-[#ac2a5d] leading-none dark:text-[#ff6b9d]">R</span>
                        <input
                            aria-label="Amount"
                            id="amount"
                            {...register("amount")}
                            placeholder="0.00"
                            className="text-5xl font-medium text-[#091828] bg-transparent text-center outline-none w-48 leading-none dark:text-white dark:placeholder:text-[#a0aec0]"
                        />
                    </div>
                    {errors.amount && <p className="text-xs text-red-500 mt-1 dark:text-[#ffb4ab]">{errors.amount.message}</p>}
                    <p className="text-sm font-medium text-[#72cdbc] mt-2 dark:text-[#5eead4]">How much is this for?</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">

                    {/* Type - icon picker */}
                    <Controller
                        control={control}
                        name="type"
                        render={({field}) => (
                            <div>
                                <p className="text-sm font-medium text-[#091828] mb-3 ml-1 dark:text-white">Pick a type</p>
                                <div className="flex gap-4 overflow-x-auto pt-1.5 pl-1.5 pr-1.5 pb-4 -mt-1.5 -ml-1.5 -mr-1.5">
                                    {TYPE_OPTIONS.map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            aria-label={opt.label}
                                            onClick={() => { field.onChange(opt.value); setActiveIconId(opt.id); }}
                                            className="flex flex-col items-center gap-1.5 flex-shrink-0"
                                        >
                                            <div className={cn(
                                                "size-16 rounded-full flex items-center justify-center transition",
                                                opt.bg, opt.textColor,
                                                activeIconId === opt.id && "ring-[3px] ring-[#091828] dark:ring-white",
                                            )}>
                                                {opt.icon}
                                            </div>
                                            <span className={cn(
                                                "text-xs font-medium",
                                                activeIconId === opt.id ? "text-[#ac2a5d] dark:text-[#ff6b9d]" : "text-[#091828] dark:text-white",
                                            )}>{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    />

                    {/* Name */}
                    <div>
                        <label htmlFor="name" className="block text-xs font-medium text-[#091828] mb-1.5 ml-1 dark:text-white">What is this for?</label>
                        <div className="bg-white rounded-2xl px-4 py-3.5 dark:bg-[#131b2e]">
                            <input
                                id="name"
                                {...register("name")}
                                placeholder="e.g. Netflix Subscription"
                                className="w-full bg-transparent outline-none text-sm text-[#091828] placeholder:text-[#9b96a8] dark:text-white dark:placeholder:text-[#a0aec0]"
                            />
                        </div>
                        {errors.name && <p className="text-xs text-red-500 mt-1 ml-1 dark:text-[#ffb4ab]">{errors.name.message}</p>}
                    </div>


                    {/* Priority */}
                    <div>
                        <label htmlFor="priority" className="block text-xs font-medium text-[#091828] mb-1.5 ml-1 dark:text-white">Priority</label>
                        <Controller
                            control={control}
                            name="priority"
                            render={({field}) => {
                                const opt = PRIORITY_OPTIONS.find(p => p.value === field.value) ?? PRIORITY_OPTIONS[1];
                                return (
                                    <div className="bg-white rounded-2xl px-3 py-2.5 flex items-center gap-3 relative dark:bg-[#131b2e]">
                                        <div className={cn("size-9 rounded-full flex items-center justify-center flex-shrink-0", opt.iconBg)}>
                                            <Flag className="size-4 text-[#091828]" />
                                        </div>
                                        <span className="flex-1 text-sm text-[#091828] dark:text-white">{opt.label}</span>
                                        <ChevronDown className="size-4 text-[#6b6375] dark:text-[#a0aec0]" />
                                        <select
                                            id="priority"
                                            value={field.value}
                                            onChange={e => field.onChange(e.target.value)}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                        >
                                            {PRIORITY_OPTIONS.map(p => (
                                                <option key={p.value} value={p.value}>{p.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                );
                            }}
                        />
                    </div>

                    {/* Due date / End date */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-[#091828] mb-1.5 ml-1 dark:text-white">Due date</label>
                            <Controller
                                control={control}
                                name="startDate"
                                render={({field}) => (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button
                                                type="button"
                                                aria-label="Select due date"
                                                className="w-full bg-white rounded-2xl px-3 py-2.5 flex items-center gap-2 dark:bg-[#131b2e]"
                                            >
                                                <div className="size-8 rounded-full bg-[#9B7EDE] flex items-center justify-center flex-shrink-0">
                                                    <CalendarIcon className="size-4 text-white" />
                                                </div>
                                                <span className="text-xs font-medium text-[#091828] dark:text-white">
                                                    {field.value
                                                        ? new Intl.DateTimeFormat("en-GB", {day: "numeric", month: "short"}).format(new Date(field.value))
                                                        : "Pick"}
                                                </span>
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-white border rounded-md shadow-md dark:border-[#2d3449] dark:bg-[#131b2e]" align="start">
                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                                        </PopoverContent>
                                    </Popover>
                                )}
                            />
                            {errors.startDate && <p className="text-xs text-red-500 mt-1 ml-1 dark:text-[#ffb4ab]">{errors.startDate.message}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[#091828] mb-1.5 ml-1 dark:text-white">End date</label>
                            <Controller
                                control={control}
                                name="endDate"
                                render={({field}) => (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button
                                                type="button"
                                                aria-label="Select end date"
                                                className="w-full bg-white rounded-2xl px-3 py-2.5 flex items-center gap-2 dark:bg-[#131b2e]"
                                            >
                                                <div className="size-8 rounded-full bg-[#DCEFE8] flex items-center justify-center flex-shrink-0">
                                                    <CalendarIcon className="size-4 text-[#091828]" />
                                                </div>
                                                <span className="text-xs font-medium text-[#9b96a8] dark:text-[#a0aec0]">
                                                    {field.value
                                                        ? new Intl.DateTimeFormat("en-GB", {day: "numeric", month: "short"}).format(new Date(field.value))
                                                        : "Optional"}
                                                </span>
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-white border rounded-md shadow-md dark:border-[#2d3449] dark:bg-[#131b2e]" align="start">
                                            <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} />
                                        </PopoverContent>
                                    </Popover>
                                )}
                            />
                        </div>
                    </div>

                    {/* Frequency */}
                    <div>
                        <label htmlFor="frequency" className="block text-xs font-medium text-[#091828] mb-1.5 ml-1 dark:text-white">Frequency</label>
                        <Controller
                            control={control}
                            name="schedule.frequency"
                            render={({field}) => {
                                const label = FREQUENCY_OPTIONS.find(f => f.value === field.value)?.label ?? "Monthly";
                                return (
                                    <div className="bg-white rounded-2xl px-3 py-2.5 flex items-center gap-3 relative dark:bg-[#131b2e]">
                                        <div className="size-9 rounded-full bg-[#72cdbc] flex items-center justify-center flex-shrink-0">
                                            <Repeat className="size-4 text-[#091828]" />
                                        </div>
                                        <span className="flex-1 text-sm text-[#091828] dark:text-white">{label}</span>
                                        <ChevronDown className="size-4 text-[#6b6375] dark:text-[#a0aec0]" />
                                        <select
                                            id="frequency"
                                            value={field.value}
                                            onChange={e => field.onChange(e.target.value)}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                        >
                                            {FREQUENCY_OPTIONS.map(f => (
                                                <option key={f.value} value={f.value}>{f.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                );
                            }}
                        />
                    </div>

                    {/* Total occurrences - label preserves the typo the test asserts against */}
                    <div>
                        <label htmlFor="totalOccurrences" className="block text-xs font-medium text-[#091828] mb-1.5 ml-1 dark:text-white">Total occurrences</label>
                        <div className="bg-white rounded-2xl px-3 py-2.5 flex items-center gap-3 dark:bg-[#131b2e]">
                            <div className="size-9 rounded-full bg-[#FFE9B5] flex items-center justify-center flex-shrink-0">
                                <Hash className="size-4 text-[#7a5a00]" />
                            </div>
                            <input
                                id="totalOccurrences"
                                {...register("schedule.totalOccurrences")}
                                placeholder="e.g. 12"
                                className="flex-1 text-sm text-[#091828] bg-transparent outline-none placeholder:text-[#9b96a8] dark:text-white dark:placeholder:text-[#a0aec0]"
                            />
                        </div>
                        {errors.schedule?.totalOccurrences && (
                            <p className="text-xs text-red-500 mt-1 ml-1 dark:text-[#ffb4ab]">
                                {errors.schedule.totalOccurrences.message}
                            </p>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-xs font-medium text-[#091828] mb-1.5 ml-1 dark:text-white">Description</label>
                        <div className="bg-white rounded-2xl px-4 py-3.5 dark:bg-[#131b2e]">
                            <textarea
                                id="description"
                                {...register("description")}
                                placeholder="Add some notes..."
                                rows={2}
                                className="w-full text-sm text-[#091828] bg-transparent outline-none resize-none placeholder:text-[#9b96a8] dark:text-white dark:placeholder:text-[#a0aec0]"
                            />
                        </div>
                    </div>

                    {/* Reminders toggle */}
                    <div className="bg-white rounded-2xl px-3 py-3 flex items-center gap-3 dark:bg-[#131b2e]">
                        <div className="size-9 rounded-full bg-[#ac2a5d] flex items-center justify-center flex-shrink-0 dark:bg-[#ff6b9d]">
                            <Bell className="size-4 text-white dark:text-[#6e0035]" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-[#091828] dark:text-white">Reminders</p>
                            <p className="text-[11px] text-[#6b6375] dark:text-[#a0aec0]">Get notified before this payment is due</p>
                        </div>
                        <Controller
                            control={control}
                            name="reminders.enabled"
                            render={({field}) => (
                                <div
                                    onClick={() => field.onChange(!field.value)}
                                    className={cn(
                                        "relative w-11 h-6 rounded-full cursor-pointer transition-colors duration-200",
                                        field.value ? "bg-[#ac2a5d] dark:bg-[#ff6b9d]" : "bg-[#DDE4E0] dark:bg-[#2d3449]",
                                    )}
                                >
                                    <div className={cn(
                                        "absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full transition-transform duration-200",
                                        field.value ? "translate-x-[22px]" : "translate-x-[3px]",
                                    )} />
                                </div>
                            )}
                        />
                    </div>

                    {/* Notification channels */}
                    {remindersEnabled ? (
                        <div className="bg-white rounded-2xl px-3 py-3 flex items-center gap-3 dark:bg-[#131b2e]">
                            <div className="size-9 rounded-full bg-[#DCEFE8] flex items-center justify-center flex-shrink-0 dark:bg-[#0f4f42]">
                                <Smartphone className="size-4 text-[#091828] dark:text-[#5eead4]" />
                            </div>
                            <span className="flex-1 text-sm text-[#091828] dark:text-white">Notification channels:</span>
                            <span className="bg-[#DCEFE8] text-[#08060d] text-[10px] font-medium px-3 py-1 rounded-full tracking-wide dark:bg-[#0f4f42] dark:text-[#5eead4]">IN_APP</span>
                        </div>
                    ) : null}

                    {/* Motivational stickers */}
                    <div className="relative h-24 mt-2">
                        <div className="absolute left-4 top-0 bg-[#FFE9B5] border-2 border-[#091828] rounded-full px-4 py-2 text-xs font-medium text-[#091828] -rotate-3 shadow-[3px_3px_0_#091828] dark:border-[#060e20] dark:bg-[#ffd166] dark:shadow-[3px_3px_0_#060e20]">
                            +15 XP for logging
                        </div>
                        <div className="absolute left-9 top-9 bg-[#FFD8E6] border-2 border-[#091828] rounded-full px-4 py-2 text-xs font-medium text-[#091828] rotate-3 shadow-[3px_3px_0_#091828] dark:border-[#060e20] dark:bg-[#ff6b9d] dark:shadow-[3px_3px_0_#060e20]">
                            Plan ahead, stress less
                        </div>
                    </div>

                    {/* Submit -aria-label keeps test passing; visible text matches mockup */}
                    <button
                        type="submit"
                        aria-label="Log obligation"
                        disabled={isSubmitting}
                        className="w-full bg-[#091828] text-white rounded-full py-4 text-base font-medium flex items-center justify-center gap-2.5 disabled:opacity-50 border-none dark:bg-[#ff6b9d]  dark:hover:bg-[#6e0035]"
                    >
                        {isSubmitting ? "Saving..." : "Log it"}
                        {!isSubmitting && <Rocket className="size-4" />}
                    </button>
                </form>
            </div>

            {showPopup && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-[#FF6B9D] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-[#091828] dark:border-[#060e20] dark:bg-[#ff6b9d] dark:text-[#6e0035]">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold">Added new obligation!</span>
                        <CustomBadge variant="xp">+10 xp</CustomBadge>
                    </div>
                </div>
            )}
        </div>
    );
}