import * as React from "react"
import {useNavigate, Link} from "react-router-dom"
import {CustomCard} from "@/components/ui/CustomCard"
import {CustomBadge} from "@/components/common/CustomBadges"

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
} from "lucide-react"
import {cn} from "@/lib/utils"
import {useUserProfile, initialsFor} from "@/hooks/useUserProfile"
import {BottomNav} from "@/components/common/BottomNav"


type MenuItem={
    label: string
    icon: React.ReactNode
    to: string
    enabled: boolean
    state?: Record<string, unknown>
}


const menuItems: MenuItem[]=[
    {label: "Edit Profile", icon: <User className="size-5"/>, to: "/edit-profile", enabled: true},
    {label: "Friends & Social", icon: <Users className="size-5"/>, to: "/friends", enabled: true, state: {from: "profile"}},
    {label: "Sticker Album", icon: <Star className="size-5"/>, to: "/stickers", enabled: true},
    {label: "Wrapped", icon: <Gift className="size-5"/>, to: "/wrapped", enabled: true},
    {label: "Mascot Home", icon: <Smile className="size-5"/>, to: "/mascot", enabled: true},
    {label: "Help & Support", icon: <HelpCircle className="size-5"/>, to: "/help", enabled: true},


]

export default function ProfilePage(){
    const nav = useNavigate()
    const {user, loading, error, refetch}=useUserProfile()

    return(
        <div className = "min-h-screen bg-[#f4fbf7] pb-24 dark:bg-[#0b1326]">
            <div className="mx-auto w-full max-w-md px-5 pt-6">
                <header className = "flex items-center justify-between">
                     <button type="button" aria-label="Go back" onClick={() => nav(-1)} className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FF6B9D] shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#ffb1c5] dark:shadow-[4px_4px_0_#060e20]">
                        <ChevronLeft className="size-5 text-[#6E0034] dark:text-[#650030]" />
                    </button>
 
                    <div className="flex flex-1 items-center justify-center">
                        <div
                            className="rounded-full border-2 border-[#091828] bg-white px-7 py-2.5 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#ffb1c5] dark:shadow-[4px_4px_0_#ff6b9d]"
                            style={{transform: "rotate(-3deg)"}}>
                                
                            <span className="text-base font-bold text-[#091828] dark:text-[#091828]">Profile</span>
                        </div>
                    </div>


                    <button type="button" aria-label="Settings" onClick={()=>nav("/settings")} className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#E3EAE6] shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#2d3449] dark:shadow-[4px_4px_0_#060e20]">
                        <Settings className="size-5 text-[#091828] dark:text-[#dae2fd]"/>
                    </button>
                </header>

                <div className="mt-6 flex flex-col items-center text-center">
                    {loading && (
                        <p className="mt-6 text-sm text-[#6B6375] dark:text-[#ddbfc5]">Loading profile...</p>
                    )}

                    {error && !loading &&(
                        <div className="mt-6">
                            <p className="text-sm text-[#AC2A5D] dark:text-[#ffb4ab]">Couldn't load your profile</p>
                            <button type="button" onClick={refetch} className="mt-2 text-xs font-bold text-[#091828] underline dark:text-[#dae2fd]">
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
                                <div className="flex size-16 items-center justify-center rounded-full bg-[#0A1929] text-white text-lg font-bold dark:bg-[#ff6b9d] dark:text-[#6e0035]">
                                    {initialsFor(user.displayName)}
                                </div>
                            )}

                            <h2 className="mt-3 text-xl font-extrabold text-[#091828] dark:text-[#dae2fd]">
                                {user.displayName}
                            </h2>

                            <CustomBadge variant="tier" size="sm" className="mt-2 dark:border-[#060e20] dark:bg-[#c19933] dark:text-[#453300] dark:shadow-[3px_4px_0_#060e20]">
                                Level {user.level} - {user.tier}
                            </CustomBadge>

                            <p className="mt-2 text-xs text-[#6b6375] dark:text-[#ddbfc5]">
                                Member since {user.memberSince}
                            </p>

                        </>
                    )}

                </div>
                
                <CustomCard className="mt-6 rounded-3xl bg-white p-2 shadow-sm dark:border dark:border-solid dark:border-[#574146] dark:bg-[#171f33] dark:shadow-none">
                    {menuItems.map((item)=>(<ProfileMenuRow key = {item.label}{...item}/>))}
                </CustomCard>

            </div>
            <BottomNav/>
        </div>

    )
}

function ProfileMenuRow({label, icon, to, enabled, state}: MenuItem){
    return(
        <Link
            to={to}
            state={state}
            aria-disabled={!enabled}
            onClick={(e)=>{if(!enabled) e.preventDefault()}}
            className={cn("flex items-center gap-3 px-3 py-3 border-b border-[#e8e4f4] last:border-b-0 transition dark:border-[#574146]", enabled? "hover:bg-[#f4fbf7] dark:hover:bg-[#222a3d]" : "opacity-40 pointer-events-none cursor-not-allowed")}
        >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e3eae6] text-[#091828] dark:bg-[#2d3449] dark:text-[#dae2fd]">{icon}</div>
            <span className="flex-1 text-sm font-bold text-[#091828] dark:text-[#dae2fd]">{label}</span>
            <ChevronRight className="size-4 shrink-0 text-[#6b6375] dark:text-[#a58a90]"/>
        </Link>
    )
}