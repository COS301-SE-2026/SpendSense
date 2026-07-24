import * as React from "react"
import {useNavigate, Link} from "react-router-dom"
import { CustomCard } from "@/components/ui/CustomCard"
import { CustomBadge } from "@/components/common/CustomBadges"
//import { IconButton } from "@/components/common/IconButton"
import {
    Settings,
    User,
    Users,
    Star,
    HelpCircle,
    Gift,
    ChevronRight,
    ChevronLeft,
    Smile,
    Flame,
    Coins,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUserProfile, initialsFor } from "@/hooks/useUserProfile"
import { BottomNav } from "@/components/common/BottomNav"


type MenuItem={
    label: string
    icon: React.ReactNode
    to: string
    enabled: boolean
}


const menuItems: MenuItem[]=[
    {label: "Edit Profile", icon: <User className="size-5"/>, to: "/edit-profile", enabled: true},
    {label: "Settings", icon: <Settings className="size-5"/>, to: "/settings", enabled: true},
    {label: "Friends & Social", icon: <Users className="size-5"/>, to: "/friends", enabled: true},
    {label: "Sticker Album", icon: <Star className="size-5"/>, to: "/stickers", enabled: true},
    {label: "Wrapped", icon: <Gift className="size-5"/>, to: "/insights", enabled: true},
    {label: "Mascot Home", icon: <Smile className="size-5"/>, to: "/mascot", enabled: true},
    {label: "Help & Support", icon: <HelpCircle className="size-5"/>, to: "/help", enabled: true},


]

export default function ProfilePage(){
    const nav = useNavigate()
    const {user, loading, error, refetch}=useUserProfile()

    return(
        <div className = "min-h-screen bg-[#f4fbf7] pb-24">
            <div className="mx-auto w-full max-w-md px-5 pt-6">
                <header className = "flex items-center justify-between">
                     <button type="button" aria-label="Go back" onClick={() => nav(-1)} className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FF6B9D] shadow-[4px_4px_0_#091828]">
                        <ChevronLeft className="size-5 text-[#6E0034]" />
                    </button>
 
                    <div className="flex flex-1 items-center justify-center">
                        <div
                            className="rounded-full border-2 border-[#091828] bg-white px-7 py-2.5 shadow-[4px_4px_0_#091828]"
                            style={{transform: "rotate(-3deg)"}}>
                                
                            <span className="text-base font-bold text-[#091828]">Profile</span>
                        </div>
                    </div>


                    <button type="button" aria-label="Settings" onClick={()=>nav("/settings")} className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#E3EAE6] shadow-[4px_4px_0_#091828]">
                        <Settings className="size-5 text-[#091828]"/>
                    </button>
                </header>

                <div className="mt-6 flex flex-col items-center text-center">
                    {loading && (
                        <p className="mt-6 text-sm text-[#6B6375]">Loading profile...</p>
                    )}

                    {error && !loading &&(
                        <div className="mt-6">
                            <p className="text-sm text-[#AC2A5D]">Couldn't load your profile</p>
                            <button type="button" onClick={refetch} className="mt-2 text-xs font-bold text-[#091828] underline">
                                Try Again
                            </button>
                        </div>
                    )}

                    {user && !loading &&(
                        <>
                            {user.avatarUrl ?(
                                <img
                                    src={user.avatarUrl}
                                    alt={`${user.displayName}'s avatar`}
                                    className="size-16 rounded-full object-cover"
                                />
                            ): (
                                <div className="flex size-16 items-center justify-center rounded-full bg-[#0A1929] text-white text-lg font-bold">
                                    {initialsFor(user.displayName)}
                                </div>
                            )}

                            <h2 className="mt-3 text-xl font-extrabold text-[#091828]">
                                {user.displayName}
                            </h2>

                            <CustomBadge variant="tier" size="sm" className="mt-2">
                                Level {user.level} - {user.tier}
                            </CustomBadge>

                            <div className="mt-3 flex items-center justify-center gap-2">
                                <StatChip
                                    icon={<Flame className="size-3.5"/>}
                                    label={`${user.paymentStreak} day streak`}
                                />

                                <StatChip
                                    icon={<Coins className="size-3.5"/>}
                                    label={`${user.coins.toLocaleString()} coins`}
                                />

                            </div>

                            <p className="mt-2 text-xs text-[#6b6375]">
                                Member since {user.memberSince}
                            </p>

                        </>
                    )}

                </div>
                
                <CustomCard className="mt-6 rounded-3xl bg-white p-2 shadow-sm">
                    {menuItems.map((item)=>(<ProfileMenuRow key = {item.label}{...item}/>))}
                </CustomCard>

            </div>
            <BottomNav active ="profile"/>
        </div>

    )
}

function StatChip({
    icon, 
    label
}: Readonly<{
    icon: React.ReactNode,
    label: string
}>){
    return(
        <span className="flex items-center gap-1 rounded-full bg-[#FFE9B5] px-2.5 py-1 text-xs font-bold text-[#7A5A00]">
            {icon}
            {label}
        </span>
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