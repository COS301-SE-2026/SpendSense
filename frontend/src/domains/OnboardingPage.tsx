import * as React from "react"
import { useNavigate, Link } from "react-router-dom"
import { Calendar, Repeat2, PiggyBank, CreditCard, Banknote, Bell } from "lucide-react"
import { CustomCard } from "@/components/ui/CustomCard"
import { Toggle } from "@/domains/SettingsPreferencesPage"
import { getReminderPreferences, updateReminderPreferences } from "@/features/reminders/remindersApi"
import { cn } from "@/lib/utils"

const GOAL_OPTIONS = [
    {id: "payments", label: "Pay on time", icon: <Calendar className="size-5"/>},
    {id: "savings", label: "Save more money", icon: <PiggyBank className="size-5"/>},
    {id: "habits", label: "Build lasting habits", icon: <Repeat2 className="size-5"/>},
    {id: "spending", label: "Cut back on spending", icon: <Banknote className="size-5"/>},
    {id: "credit", label: "Learn about credit", icon: <CreditCard className="size-5"/>},
]

const REMINDER_DAY_OPTIONS = [1, 3, 5, 7]

const button =
    "inline-flex items-center justify-center gap-2 px-5 py-3 border-2 border-[#091828] rounded-full text-sm font-extrabold shadow-[4px_5px_0_#091828] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"

interface ReminderPreferencesResponse {
    data?: {defaultReminderDaysBefore: number; inAppEnabled: boolean}
}

export default function OnboardingPage(){
    const nav = useNavigate()

    const [goals, setGoals] = React.useState<string[]>([])
    const [reminderDaysBefore, setReminderDaysBefore] = React.useState(3)
    const [inAppEnabled, setInAppEnabled] = React.useState(true)
    const [error, setError] = React.useState(false)

    const interacted = React.useRef(false)

    React.useEffect(() => {
        let cancelled = false
        getReminderPreferences().then((raw) => {
            const prefs = (raw as ReminderPreferencesResponse)?.data
            if (!cancelled && prefs && !interacted.current) {
                setReminderDaysBefore(prefs.defaultReminderDaysBefore)
                setInAppEnabled(prefs.inAppEnabled)
            }
        }).catch(() => {
        })
        return () => { cancelled = true }
    }, [])

    function toggleGoal(id: string){
        setGoals((prev)=>
            prev.includes(id) ? prev.filter((g)=> g !== id) : [...prev, id]
        )
    }

    async function persist(patch: {defaultReminderDaysBefore?: number; inAppEnabled?: boolean}){
        interacted.current = true
        setError(false)
        try {
            await updateReminderPreferences(patch)
        } catch {
            setError(true)
        }
    }

    function handleReminderDays(d: number){
        setReminderDaysBefore(d)
        void persist({defaultReminderDaysBefore: d})
    }

    function handleToggleInApp(){
        const next = !inAppEnabled
        setInAppEnabled(next)
        void persist({inAppEnabled: next})
    }

    return(
        <div className="min-h-screen bg-[#F4FBF7] px-4 pb-10 pt-8">
            <div className="mx-auto w-full max-w-sm">

                <header className="flex items-center justify-end">
                    <button
                        type="button"
                        onClick={()=> nav("/domains/dashboard")}
                        className="px-4 py-2 border-2 border-[#091828] rounded-full bg-white text-xs font-extrabold shadow-[3px_3px_0_#091828] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                    >
                        Skip
                    </button>
                </header>

                <div className="mt-2 text-center flex flex-col items-center">
                    <span className="inline-block rounded-full text-[11px] font-extrabold tracking-[0.35px] px-3 py-1.5 bg-[#FFD8E6] text-[#AC2A5D]">
                        Let's get you set up
                    </span>
                    <h1 className="mt-3 font-black text-3xl tracking-[-1.2px] text-[#091828]">Welcome to SpendSense!</h1>
                    <p className="mt-1 text-sm text-[#6B6375]">Customise your experience, or skip and change it later.</p>
                </div>

                <CustomCard variant="navyBorder" className="mt-6 bg-white p-5 rounded-3xl">
                    <h2 className="font-bold text-sm text-[#091828]">What are your main goals?</h2>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                        {GOAL_OPTIONS.map((goal)=>{
                            const selected = goals.includes(goal.id)

                            return(
                                <button
                                    key={goal.id}
                                    type="button"
                                    onClick={()=> toggleGoal(goal.id)}
                                    className={cn("flex flex-col items-center rounded-2xl gap-2 border-2 text-center transition px-2 py-4", selected ? "border-[#AC2A5D] bg-[#FFD8E6]" : "border-[#E8E4F4] bg-white")}
                                >
                                    <span className={cn(selected ? "text-[#AC2A5D]" : "text-[#091828]")}>{goal.icon}</span>
                                    <span className="font-semibold text-[11px] leading-tight text-[#091828]">{goal.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </CustomCard>

                <CustomCard variant="navyBorder" size="sm" className="mt-4">
                    <p className="text-sm font-bold text-[#091828]">Remind me before a payment is due</p>
                    <div className="mt-3 flex gap-2">
                        {REMINDER_DAY_OPTIONS.map((d)=> (
                            <button
                                key={d}
                                type="button"
                                onClick={()=> handleReminderDays(d)}
                                aria-pressed={reminderDaysBefore === d}
                                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${reminderDaysBefore === d ? "bg-[#FFD8E6] text-[#AC2A5D]" : "bg-[#E3EAE6] text-[#6B6375] hover:text-[#091828]"}`}
                            >
                                {d} {d === 1 ? "day" : "days"}
                            </button>
                        ))}
                    </div>
                </CustomCard>

                <CustomCard variant="navyBorder" size="sm" className="mt-4 p-2">
                    <div className="flex items-center gap-3 px-3 py-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FFD8E6] text-[#AC2A5D]">
                            <Bell className="size-4"/>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-[#091828]">In App Notifications</p>
                            <p className="text-xs text-[#6B6375]">Get notifications and reminders in the SpendSense app</p>
                        </div>
                        <Toggle
                            checked={inAppEnabled}
                            onChange={handleToggleInApp}
                            label="In App Notifications"
                        />
                    </div>
                </CustomCard>

                {error && (
                    <p className="mt-3 text-center text-xs text-[#AC2A5D]">Your last change couldn't be saved. Please try again.</p>
                )}

                <Link
                    to="/help"
                    className="mt-4 flex items-center justify-between gap-3 rounded-3xl border-2 border-[#091828] bg-white px-5 py-4 text-sm font-bold text-[#091828] transition-all hover:translate-x-[2px] hover:translate-y-[2px]"
                >
                    New here? See how SpendSense works
                    <span>→</span>
                </Link>

                <button
                    type="button"
                    onClick={()=> nav("/domains/dashboard")}
                    className={`${button} mt-6 w-full bg-[#FF6B9D] text-[#500D26]`}
                >
                    Continue
                </button>

            </div>
        </div>
    )
}
