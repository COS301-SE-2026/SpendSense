import * as React from "react"
import {Bell} from "lucide-react"
import {CustomCard} from "@/components/ui/CustomCard"
import {SubPageShell} from "@/components/common/SubPageShell"
import {Toggle} from "@/domains/SettingsPreferencesPage"

type NotificationKey=
    | "friendRequests"
    |"wrappedAnnouncements"
    | "challengeReminders"
    |"budgetAlerts"


const notificationRow: {key: NotificationKey; label: string, description: string} []=[
    {key: "friendRequests", label: "Friend Requests", description: "Get notified about new friend requests"},
    {key: "wrappedAnnouncements", label: "Wrapped Announcements", description: "Monthly wrap is ready"},
    {key: "challengeReminders", label: "Challenge Reminders", description: "Reminders to complete daily challenges"},
    {key: "budgetAlerts", label: "Budget Alerts", description: "Alerts for budget and expenses"},
] 

const REMINDER_DAY_OPTIONS=[1,3,5,7]

export default function SettingsNotificationsPage(){
    const [prefs, setPrefs] = React.useState<Record<NotificationKey, boolean>>({
        friendRequests: true,
        wrappedAnnouncements: true,
        challengeReminders: true,
        budgetAlerts: false,
    })

    const[reminderDays, setReminderDays] = React.useState(3)

    React.useEffect(()=> {
        //TODO: load through notifications GET/notifications-preferences when it exists
    }, [])

    const handleToggle =(key: NotificationKey)=> {
        setPrefs((prev)=> {
            const next={...prev, [key]: !prev[key]}
            //TODO: save via PATCH /notification-preferences 
            return next
        })
    }

    const handleReminderDays=(days: number)=>{
        setReminderDays(days)
        //TODO: save defaultReminderDaysBefore via endpoint
    }

    return(
        <SubPageShell title= "Notifications and Reminders" subtitle ="What SpendSense notifies you about">

            <SectionLabel>Reminders</SectionLabel>
            <CustomCard variant="navyBorder" size="sm">
                <p className="text-sm font-bold text-[#091828]">Remind me before a payment is due</p>
                <div className ="mt-3 flex gap-2">
                    {REMINDER_DAY_OPTIONS.map((d)=> (
                        <button 
                            key={d}
                            type="button"
                            onClick={()=> handleReminderDays(d)}
                            aria-pressed={reminderDays===d}
                            className={`rounded-full px-3 py-1.5 text-xs font bold transition ${reminderDays===d ? "bg-[#FFD8E6] text-[#AC2A5D]" : "bg-[#E3EAE6] text-[6B6375] hover: text-[#091828]"}`}>

                            {d} {d===1 ? "day": "days"}
                        </button>
                    ))}
                </div>
            </CustomCard>

            <SectionLabel className="mt-3">Notifications</SectionLabel>

            <CustomCard variant ="navyBorder" size="sm" className="p-2">
                {notificationRow.map((row)=> (
                    <div key={row.key} className = "flex items-center gap-3 border-b border-[#E8E4F4] px-3 py-3 last:border-b-0">
                        <div className = "flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FFD8E6] text-[#AC2A5D]">
                            <Bell className="size-4"/>
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-[#091828]">{row.label}</p>
                        </div>

                        <Toggle
                            checked={prefs[row.key]}
                            onChange={() => handleToggle(row.key)}
                            label={row.label}
                        />

                    </div>
                ))}
            </CustomCard>
        </SubPageShell>
    )

}

function SectionLabel({
    children,
    className,
}: Readonly<{
    children: React.ReactNode
    className?: string
}>) {
    return (
        <h2 className={`text-sm font-bold uppercase tracking-wide text-[#6B6375] ${className ?? ""}`}>
            {children}
        </h2>
    )
}
