import {Link} from "react-router-dom"
import {Sliders,
        Bell,
        UserX,
        ChevronRight
} from "lucide-react"

import {CustomCard} from "@/components/ui/CustomCard"
import {SubPageShell} from "@/components/common/SubPageShell"

//settings hub page to navigate to more specific preferences

const sections =[
    {
        label: "General Preferences",
        description: "Theme, currency, language, reduced motion",
        icon: <Sliders className="size-5" />,
        to: "/settings/preferences",
    },
    {
        label: "Notifications and Reminders",
        description: "What SpendSense notifies you about",
        icon: <Bell className="size-5"/>,
        to: "/settings/notifications",
    },
    {
        label: "Account",
        description: "Logout, deactivate, export your data",
        icon: <UserX className="size-5"/>,
        to: "/settings/account",
    },
]

export default function SettingsPage(){
    return (
        <SubPageShell title="Settings" subtitle="Account and app preferences">
            {sections.map((s) => (
                <Link key={s.to} to={s.to}>
                    <CustomCard variant="navyBorder" size="sm" className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#E3EAE6] text-[#091828]">
                            {s.icon}
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className ="text-sm font-bold text-[#091828]">{s.label}</p>
                            <p className ="text-xs text-[#6B6375]">{s.description}</p>
                        </div>
                        <ChevronRight className ="size-4 shrink-0 text-[#6B6375]"/>
                    </CustomCard>
                </Link>
            ))}
        </SubPageShell>
    )
}