import * as React from "react"
import {useNavigate, Link} from "react-router-dom"
import { CustomCard } from "@/components/ui/CustomCard"
import { CustomBadge } from "@/components/common/CustomBadges"
import { IconButton } from "@/components/common/IconButton"
import {
    Settings,
    User,
    Users,
    Star,
    CircleQuestionMark,
    Gift,
    ChevronRight,
    Smile,
} from "lucide-react"
import { cn } from "@/lib/utils"


const mockUser={
    initials: "KH",
    name: "Kahlan H.",
    level: 7,
    tier: "Budget Apprentice",
    memberSince: "July 2026",
}

type MenuItem={
    label: string
    icon: React.ReactNode
    to: string
    enabled: boolean
}

//currently some are set to false since these pages dont exist yet
// flip to true as these pages get made

const menuItems: MenuItem[]=[
    {label: "Edit Profile", icon: <User className="size-5"/>, to: "/edit-profile", enabled: false},
    {label: "Settings", icon: <Settings className="size-5"/>, to: "/settings", enabled: false},
    {label: "Friends & Social", icon: <Users className="size-5"/>, to: "/friends", enabled: false},
    {label: "Sticker Album", icon: <Star className="size-5"/>, to: "/stickers", enabled: true},
    {label: "Wrapped", icon: <Gift className="size-5"/>, to: "/wrapped", enabled: false},
    {label: "Mascot Home", icon: <Smile className="size-5"/>, to: "/mascot", enabled: false},
    {label: "Help & Support", icon: <CircleQuestionMark className="size-5"/>, to: "/help", enabled: false},


]

export default function ProfilePage(){
    const nav = useNavigate()

    return(
        <div className = "min-h-screen bg-[#f4fbf7] pb-24">
            <div className="mx-auto w-full max-w-md px-5 pt-6">
                <header className = "flex items-center justify-between">
                    <IconButton IconVariant="iconBack" aria-label = "Go back" onClick = {() => nav(-1)}/>
                    <h1 className = "text-lg font-bold text-[#091828]">Profile</h1>

                    <button type="button" aria-label="Settings" onClick={()=>nav("/settings")} className="flex size-10 items-center justify-center rounded-full bg-[#e3eae6] text-[#091828] transition hover:bg-[#c7d8cf] active:translate-y-px">
                        <Settings className="size-5"/>
                    </button>
                </header>

                <div className="mt-6 flex flex-col items-center text-center">
                    <div className="flex size-16 items-center justify-center rounded-full bg-[#0a1929] text-white text-lg font-bold">
                        {mockUser.initials}
                    </div>

                    <h2 className="mt-3 text-xl font-extrabold text-[#091828]">
                        {mockUser.name}
                    </h2>

                    <CustomBadge variant="tier" size="sm" className="mt-2">
                        Level {mockUser.level} - {mockUser.tier}
                    </CustomBadge>

                    <p className="mt-2 text-xs text-[#6b6375]">
                        Member since {mockUser.memberSince}
                    </p>
                </div>

                <CustomCard className="mt-6 rounded-3xl bg-white p-2 shadow-sm">
                    {menuItems.map((item)=>(<ProfileMenuRow key = {item.label}{...item}/>))}
                </CustomCard>

            </div>
        </div>

    )
}

function ProfileMenuRow({label, icon, to, enabled}: MenuItem){
    return(
        <Link 
            to={to}
            aria-disabled={!enabled}
            onClick={(e)=>{if(!enabled) e.preventDefault()}}
            className={cn("flex items-center gap-3 px-3 py-3 border-b border-[#e8e4f4] last:border-b-0 transition", enabled? "hover:bg-[#f4fbf7]" : "opacity-40 pointer-events-none cursor-not-allowed")}
        >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e3eae6] text-[#091828]">{icon}</div>
            <span className="flex-1 text-sm font-bold text-[#091828]">{label}</span>
            <ChevronRight className="size-4 shrink-0 text-[#6b6375]"/>
        </Link>
    )
}