import * as React from "react"
import {Bell} from "lucide-react"
import {CustomCard} from "@/components/ui/CustomCard"
import {SubPageShell} from "@/components/common/SubPageShell"
import {Toggle} from "@/domains/SettingsPreferencesPage"
import {getReminderPreferences, updateReminderPreferences} from "@/features/reminders/remindersApi"

interface ReminderPreferences {
    inAppEnabled: boolean
    emailEnabled: boolean
    pushEnabled: boolean
    smsEnabled: boolean
    defaultReminderDaysBefore: number
    quietHoursStart: string | null
    quietHoursEnd: string | null
}

interface ReminderPreferencesResponse {
    data?: ReminderPreferences
}

type ChannelKey = "inAppEnabled"

const REMINDER_DAY_OPTIONS = [1, 3, 5, 7]

const CHANNEL_ROWS: {key: ChannelKey; label: string; description: string}[] = [
    {key: "inAppEnabled", label: "In App Notifications", description: "Get notifications and reminders in the SpendSense app"},
]

export default function SettingsNotificationsPage(){
    const [prefs, setPrefs] = React.useState<ReminderPreferences | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState(false)
    const [saving, setSaving] = React.useState(false)
    const [feedback, setFeedback] = React.useState<{kind: "success" | "error"; message: string} | null>(null)

    const fetchPrefs = React.useCallback(async () => {
        setLoading(true)
        setError(false)
        try {
            const raw = await getReminderPreferences() as ReminderPreferencesResponse
            setPrefs(raw?.data ?? null)
        } catch {
            setError(true)
            setPrefs(null)
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchPrefs()
    }, [fetchPrefs])

    const persist = async (next: ReminderPreferences, patch: Partial<ReminderPreferences>) => {
        setPrefs(next)
        setSaving(true)
        setFeedback(null)
        try {
            await updateReminderPreferences(patch)
            setFeedback({kind: "success", message: "Reminder settings saved"})
        } catch {
            setFeedback({kind: "error", message: "Your changes couldn't be saved. Please try again."})
        } finally {
            setSaving(false)
        }
    }

    const handleToggle = (key: ChannelKey) => {
        if (!prefs) return
        const next = {...prefs, [key]: !prefs[key]}
        void persist(next, {[key]: next[key]})
    }

    const handleReminderDays = (days: number) => {
        if (!prefs) return
        const next = {...prefs, defaultReminderDaysBefore: days}
        void persist(next, {defaultReminderDaysBefore: days})
    }

    return(
        <SubPageShell title="Notifications and Reminders" subtitle="What SpendSense will notify you about">
            {loading && <p className="text-sm text-[#6B6375] dark:text-[#a0aec0]">Loading...</p>}

            {error && !loading && (
                <div>
                    <p className="text-sm text-[#AC2A5D] dark:text-[#ff6b9d]">Your reminder settings couldn't be loaded.</p>
                    <button
                        type="button"
                        onClick={()=> void fetchPrefs()}
                        className="mt-2 text-xs font-bold text-[#091828] underline dark:text-[#ffffff]"
                    >
                        Try again
                    </button>
                </div>
            )}

            {prefs && !loading && !error && (
                <>
                    <SectionLabel>Reminders</SectionLabel>
                    <CustomCard variant="navyBorder" size="sm">
                        <p className="text-sm font-bold text-[#091828] dark:text-[#ffffff]">Remind me before a payment is due</p>
                        <div className="mt-3 flex gap-2">
                            {REMINDER_DAY_OPTIONS.map((d)=> (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={()=> handleReminderDays(d)}
                                    aria-pressed={prefs.defaultReminderDaysBefore === d}
                                    disabled={saving}
                                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${prefs.defaultReminderDaysBefore === d ? "bg-[#FFD8E6] text-[#AC2A5D] dark:bg-[#2d1b2e] dark:text-[#ff6b9d]" : "bg-[#E3EAE6] text-[#6B6375] hover:text-[#091828] dark:bg-[#1c263c] dark:text-[#a0aec0]"}`}
                                >
                                    {d} {d === 1 ? "day" : "days"}
                                </button>
                            ))}
                        </div>
                    </CustomCard>

                    <SectionLabel className="mt-3">Reminder Channels</SectionLabel>
                    <CustomCard variant="navyBorder" size="sm" className="p-2">
                        {CHANNEL_ROWS.map((row)=> (
                            <div key={row.key} className="flex items-center gap-3 border-b border-[#E8E4F4] px-3 py-3 last:border-b-0 dark:border-[#2d3449]">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FFD8E6] text-[#AC2A5D] dark:bg-[#2d1b2e] dark:text-[#ff6b9d]">
                                    <Bell className="size-4"/>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-[#091828] dark:text-[#ffffff]">{row.label}</p>
                                    <p className="text-xs text-[#6B6375] dark:text-[#a0aec0]">{row.description}</p>
                                </div>
                                <Toggle
                                    checked={prefs[row.key]}
                                    onChange={()=> handleToggle(row.key)}
                                    label={row.label}
                                />
                            </div>
                        ))}
                    </CustomCard>

                    {feedback && (
                        <p className={`text-center text-xs ${feedback.kind === "success" ? "text-[#3DBFA0] dark:text-[#5eead4]" : "text-[#AC2A5D] dark:text-[#ff6b9d]"}`}>
                            {feedback.message}
                        </p>
                    )}
                </>
            )}
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