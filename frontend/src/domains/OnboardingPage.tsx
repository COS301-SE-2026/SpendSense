import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Calendar, Repeat2, PiggyBank, ChevronDown, CreditCard, BanknoteArrowDown } from "lucide-react"
import { CustomCard } from "@/components/ui/CustomCard"
import { LongButton } from "@/components/common/LongButton"
import { cn } from "@/lib/utils"

// TODO: add actual saving for preferences, make handleContinue() actually persist

const GOAL_OPTIONS=[
    {id: "payments", label: "Pay on time", icon: <Calendar className="size-5"/>},
    {id: "savings", label: "Save more money", icon: <PiggyBank className="size-5"/>},
    {id: "habits", label: "Build lasting habits", icon: <Repeat2 className="size-5"/>},
    {id: "spending", label: "Cut back on spending", icon: <BanknoteArrowDown className="size-5"/>},
    {id: "credit", label: "Learn about credit", icon: <CreditCard className="size-5"/>},
]

const DAY_OPTIONS=[
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
]

const CURRENCY=[
    {value: "ZAR", label: "South African Rand (R)"},
    {value: "EUR", label: "Euro (€)"},
    {value: "USD", label: "United States Dollar ($)"},
]

const PAYDAY= Array.from({length: 31}, (_, i) => String(i + 1))


export default function OnboardingPage(){
    const nav = useNavigate()

    const[goals, setGoals] = React.useState<string[]>([])
    // for notifications
    const[reminderDay, setReminderDay] = React.useState("Sunday")
    const[reminderTime, setReminderTime] = React.useState("16:00")

    const[currency, setCurrency] = React.useState("ZAR")
    const[payday, setPayday] = React.useState("15")


    function toggleGoal(id: string){
        setGoals((prev)=>
            prev.includes(id)? prev.filter((g)=> g !== id) : [...prev, id]
        )
    }

    function handleContinue(){
        // add that it persists/saves once endpoint created
        nav("/dashboard")
    }


    return(
        <div className="min-h-screen bg-[#f4fbf7] px-4 pb-10 pt-8">
            <div className="mx-auto w-full max-w-sm">

                <header className="flex items-center justify-end">
                    <button type="button" onClick={handleContinue} className="text-xs font-semibold text-[#6b6375] hover:text-[#091828]">Skip</button>
                </header>

                <div className=" mt-2 text-center flex flex-col items-center">
                    <h1 className="mt-3 font-extrabold text-2xl text-[#091828]">Welcome to SpendSense!</h1>
                    <p className="mt-1 text-sm text-[#6b6375]">Customise your experience</p>
                </div>

                <CustomCard className="mt-6 bg-white p-5 shadow-sm rounded-3xl">
                    <div className="flex items-baseline justify-between">
                        <h2 className="font-bold text-sm text-[#091828]">What are your main goals?</h2>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                        {GOAL_OPTIONS.map((goal)=>{
                            const selected = goals.includes(goal.id)

                            return(
                                <button
                                    key={goal.id}
                                    type="button"
                                    onClick={()=>toggleGoal(goal.id)}
                                    className={cn("flex flex-col items-center rounded-2xl gap-2 border-2 text-center transition px-2 py-4", selected? "border-[#ac2a5d] bg-[#ffd8e6]":"border-[#e8e4f4] bg-white")}
                                >

                                    <span className={cn(selected? "text-[#ac2a5d]":"text-[#091828]")}>{goal.icon}</span>
                                    <span className=" font-semibold text-[11px] leading-tight text-[#091828]">{goal.label}</span>

                                </button>
                            )
                        })}
                    </div>
                </CustomCard>

                <CustomCard className="rounded-3xl bg-white p-5 mt-4 shadow-sm">
                    <h2 className="font-bold text-sm text-[#091828]">Remind me to plan my finances</h2>
                    <p className="text-xs text-[#6b6375]">This can be changed at any time</p>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <OverlaySelect
                            value={reminderDay}
                            label="Every"
                            onChange={setReminderDay}
                            options={DAY_OPTIONS.map((d)=>({value: d, label: d}))}
                        />

                        <div>
                            <label className="block font-medium text-xs text-[#091828] mb-1.5 ml-1">At</label>

                            <input
                                value={reminderTime}
                                type="time"
                                onChange={(t)=>setReminderTime(t.target.value)}
                                className="h-12 rounded-2xl bg-white w-full border border-[#e8e4f4] text-sm text-[#091828] py-2.5 px-3"
                            />
                        </div>
                    </div>
                </CustomCard>

                <CustomCard className="rounded-3xl bg-white mt-4 shadow-sm p-5">
                    <h2 className="font-bold text-sm text-[#091828]">Set up your basics</h2>

                    <div className="mt-3 space-y-3">
                        <OverlaySelect
                            value={currency}
                            label="Currency"
                            onChange={setCurrency}
                            options={CURRENCY}
                        />


                        {/* payday isnt currentl in the UserPreference schema yet, but currently assumes single payday. could add multiple in the future */}
                        <OverlaySelect
                            value={payday}
                            label="Payday (Optional)"
                            onChange={setPayday}
                            options={PAYDAY.map((p)=>({value: p, label: `${p}${numberSuffix(p)} of each month`}))}
                        />
                    </div>
                </CustomCard>

                <LongButton 
                    LongSize="lg"
                    LongVariant="primaryPinkBorder"
                    onClick={handleContinue}
                    showArrow={false}
                    className="mt-6"
                >Continue</LongButton>

            </div>
        </div>
    )
}


// function to get the correct suffixes for the different days
function numberSuffix(number: string){
    const num = Number(number)
    if(num%10 === 1 && num !== 11){ //number ends in a 1 (not 11)
        return "st"
    }

    if(num%10 === 2 && num !== 12){ //number ends in a 2 (not 12)
        return "nd"
    }

    if(num%10 === 3 && num !== 13){ //number ends in a 3 (not 13)
        return "rd"
    }

    return "th" // all the rest of the numbers
}

// same as in ObligationForm.tsx (used for the Priority field) - used for real select behaviour with the custom style
function OverlaySelect({value, label, onChange, options}:{
    value: string, label: string, onChange: (value: string)=>void, options: {value: string; label: string}[]})
    {
        const curr = options.find((o)=>o.value === value)

        return(
            <div>
                <label className="block font-medium text-xs text-[#091828] ml-1 mb-1.5">{label}</label>

                <div className="h-12 flex relative gap-2 items-center border border-[#e8e4f4] rounded-2xl bg-white py-2.5 px-3">
                    <span className="truncate text-sm text-[#091828] flex-1">{curr?.label ?? "Select"}</span>

                    <ChevronDown className="text-[#6b6375] shrink-0 size-4"/>

                    <select
                        value={value}
                        onChange={(c)=>onChange(c.target.value)}
                        className="h-full w-full cursor-pointer absolute inset-0 opacity-0"
                    >
                        {options.map((o)=>(<option key={o.value} value={o.value}>{o.label}</option>))}
                    </select>
                </div>
            </div>
        )
    }