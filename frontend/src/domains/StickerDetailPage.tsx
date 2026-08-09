import {useNavigate, useLocation, useParams} from "react-router-dom"
import {cn} from "@/lib/utils"
import {
    ChevronLeft,
    Share2,
    Sparkles,
    Flame,
    Shield,
    Sword,
    Sunrise,
    Umbrella,
    Lock,
    Target,
    Star,
    Award,
    Medal,
    Zap,
    CheckCircle,
    Diamond,
    PartyPopper,
} from "lucide-react"
import type {GamificationBadge} from "@/hooks/useGamificationProfile"

// TYPES

interface BadgeRouterState{
    badge: GamificationBadge
}

// CATEGORY COLOURS

const CATEGORY_BG: Record<string, string>={
    CORE_MILESTONES: "bg-[#F2D8FF] dark:bg-[#332352]",
    SAVINGS_QUESTS: "bg-[#D6EEE8] dark:bg-[#0f4f42]",
    SPECIAL_EVENTS: "bg-[#1C1028] dark:bg-[#3d2a5c]",
    PAYMENT: "bg-[#DCEFE8] dark:bg-[#12463d]",
    STREAK: "bg-[#FFD9E1] dark:bg-[#2d1b2e]",
    MILESTONE: "bg-[#FFE7AE] dark:bg-[#3f2e00]",
    KNOWLEDGE: "bg-[#DCE8F7] dark:bg-[#1e3352]",
    SCORE: "bg-[#FFE7AE] dark:bg-[#3f2e00]",
}

const CATEGORY_ICON_COLOR: Record<string, string>={
    CORE_MILESTONES: "text-[#7C3AED] dark:text-[#c5b3f0]",
    SAVINGS_QUESTS: "text-[#0D9488] dark:text-[#5eead4]",
    SPECIAL_EVENTS: "text-white",
    PAYMENT: "text-[#16635A] dark:text-[#7fd8c4]",
    STREAK: "text-[#AC2A5D] dark:text-[#ff6b9d]",
    MILESTONE: "text-[#7A4A00] dark:text-[#ffdf9b]",
    KNOWLEDGE: "text-[#1E4FAE] dark:text-[#9dc0ea]",
    SCORE: "text-[#7A4A00] dark:text-[#ffdf9b]",
}

// real tier data would come from the api in a future iteration
const CATEGORY_TIER: Record<string, string>={
    CORE_MILESTONES: "Rare",
    SAVINGS_QUESTS: "Uncommon",
    SPECIAL_EVENTS: "Legendary",
    PAYMENT: "Common",
    STREAK: "Uncommon",
    MILESTONE: "Rare",
    KNOWLEDGE: "Common",
    SCORE: "Rare",
}

const TIER_STYLE: Record<string, {bg: string; text: string; icon: React.ReactNode}>={
    Common: {bg: "bg-[#E8EFEC] dark:bg-[#2d3449]", text: "text-[#091828] dark:text-[#ffffff]", icon: <Sparkles size={14}/>},
    Uncommon: {bg: "bg-[#D6EEE8] dark:bg-[#0f4f42]", text: "text-[#16635A] dark:text-[#7fd8c4]", icon: <Star size={14}/>},
    Rare: {bg: "bg-[#E0B0FF] dark:bg-[#332352]", text: "text-[#6E0034] dark:text-[#ff6b9d]", icon: <Award size={14}/>},
    Legendary: {bg: "bg-[#FFE7AE] dark:bg-[#3f2e00]", text: "text-[#7A4A00] dark:text-[#ffdf9b]", icon: <Diamond size={14}/>},
}

// ICONS

function StickerIconLarge({iconKey, category}: {iconKey: string; category: string}){
    const color = CATEGORY_ICON_COLOR[category] ?? "text-[#6b6375] dark:text-[#a0aec0]"
    const size = 64
    const icons: Record<string, React.ReactNode>={
        sparkles: <Sparkles size={size}/>,
        flame: <Flame size={size}/>,
        shield: <Shield size={size}/>,
        swords: <Sword size={size}/>,
        sunrise: <Sunrise size={size}/>,
        umbrella: <Umbrella size={size}/>,
        lock: <Lock size={size}/>,
        target: <Target size={size}/>,
        star: <Star size={size}/>,
        award: <Award size={size}/>,
        medal: <Medal size={size}/>,
        zap: <Zap size={size}/>,
        check: <CheckCircle size={size}/>,
        "check-circle": <CheckCircle size={size}/>,
        "trending-up": <Award size={size}/>,
        "plus-circle": <Sparkles size={size}/>,
    }
    return(
        <span className={color}>
            {icons[iconKey] ?? <Star size={size}/>}
        </span>
    )
}

function SparkleDecor({className, color = "#F2BF3C", size = 20}:{
    className?: string
    color?: string
    size?: number
}){
    return(
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
            <path d="M10 2l1.2 5.8L17 10l-5.8 1.2L10 18l-1.2-6.8L3 10l6.8-1.2L10 2z" fill={color} opacity=".9"/>
        </svg>
    )
}


// MAIN PAGE
// badge data is passed via router state from StickerAlbumPage
// this avoids an extra API call since the album has all badge data alreasy

export default function StickerDetailPage(){
    const navigate = useNavigate()
    const location = useLocation()
    const {badgeKey} = useParams<{badgeKey: string}>()

    const state = location.state as BadgeRouterState | null
    const badge = state?.badge ?? null

    if(!badge){
        return(
            <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center gap-4 px-6 text-center dark:bg-[#0b1326]">
                <p className="text-[#091828] font-bold text-lg dark:text-[#ffffff]">Sticker not found</p>
                <p className="text-sm text-[#6b6375] dark:text-[#a0aec0]">Navigate from the sticker album to view badge details.</p>
                <button
                    type="button"
                    onClick={()=>navigate("/stickers")}
                    className="text-sm text-[#AC2A5D] underline dark:text-[#ff6b9d]"
                >
                    Back to Album
                </button>
            </div>
        )
    }

    void badgeKey // used in URL for shareability, badge data comes from state

    const stickerBg = CATEGORY_BG[badge.category] ?? "bg-[#DCEFE8] dark:bg-[#12463d]"
    const tier = CATEGORY_TIER[badge.category] ?? "Common"
    const tierStyle = TIER_STYLE[tier] ?? TIER_STYLE["Common"]

    const earnedDate = badge.earnedAt
        ? new Date(badge.earnedAt).toLocaleDateString("en-ZA",{
            day: "numeric",
            month: "short",
            year: "numeric",
        }) : ""

    return(
        <div className="min-h-screen bg-[#F0F7F4] flex flex-col items-center dark:bg-[#0b1326]">
        <div className="w-full max-w-sm flex flex-col min-h-screen">

            <header className="px-5 pt-5 flex items-center justify-between">
                <button type="button" aria-label="Go back" onClick={() => navigate("/stickers")} className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FF6B9D] shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#ffb1c5] dark:shadow-[4px_4px_0_#060e20]">
                        <ChevronLeft className="size-5 text-[#6E0034] dark:text-[#650030]" />
                </button>

                <div className="flex flex-1 items-center justify-center">
                    <div
                        className="rounded-full border-2 border-[#091828] bg-white px-7 py-2.5 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#ffb1c5] dark:shadow-[4px_4px_0_#ff6b9d]"
                        style={{transform: "rotate(-3deg)"}}>

                        <h1 className="text-base font-bold text-[#091828] dark:text-[#091828]">Quest Reward</h1>
                    </div>
                </div>
                <button
                    type="button"
                    className="size-9 flex items-center justify-center rounded-full bg-white/60 text-[#091828] dark:bg-[#131b2e]/60 dark:text-[#ffffff]"
                    aria-label="Share icon"
                >
                    <Share2 size={20}/>
                </button>
            </header>

            <main className="px-6 pt-6 pb-12 flex flex-col items-center gap-6 max-w-sm mx-auto">

                {/* sparkle sticker card */}
                <div className="relative">
                    <SparkleDecor className="absolute -top-3 -right-2" color="#F2BF3C" size={24}/>
                    <SparkleDecor className="absolute top-4 -right-6" color="#F2BF3C" size={16}/>
                    <SparkleDecor className="absolute -bottom-2 -left-5" color="#FF6B9D" size={20}/>
                    <SparkleDecor className="absolute bottom-6 -left-7" color="#FF6B9D" size={13}/>
                    <div className="w-52 h-52 rounded-[2rem] bg-white border-[3px] border-[#091828] shadow-[4px_5px_0_#091828] flex items-center justify-center dark:bg-[#131b2e] dark:border-[#060e20] dark:shadow-[4px_5px_0_#060e20]">
                        <div className={cn("size-36 rounded-full flex items-center justify-center", stickerBg)}>
                            <StickerIconLarge iconKey={badge.iconKey ?? 'star'} category={badge.category}/>
                        </div>
                    </div>
                </div>

                <h2 className="text-3xl font-black text-[#091828] text-center dark:text-[#ffffff]">{badge.name}</h2>

                <div className="bg-[#FFE7AE] rounded-full px-5 py-2 border border-[#F2BF3C]/50 dark:bg-[#3f2e00]">
                    <p className="text-sm font-bold text-[#7A4A00] dark:text-[#ffdf9b]">Earned on {earnedDate}</p>
                </div>

                <p className="text-center text-[#091828] text-base leading-relaxed font-medium px-2 dark:text-[#ffffff]">
                    &quot;{badge.description}&quot;
                </p>

                <div className="flex items-center gap-3">
                    <div className={cn(
                        "flex items-center gap-1.5 rounded-full border-2 border-[#091828] shadow-[2px_3px_0_#091828] px-4 py-2 dark:border-[#060e20] dark:shadow-[2px_3px_0_#060e20]",
                        tierStyle.bg,
                        tierStyle.text,
                    )}>
                        <span>{tierStyle.icon}</span>
                        <span className="text-sm font-bold">{tier} Tier</span>
                    </div>
                </div>

                <button
                    type="button"
                    className="w-full rounded-full bg-[#FF6B9D] border-2 border-[#091828] shadow-[4px_5px_0_#091828] py-4 text-lg font-bold text-[#700034] flex items-center justify-center gap-2 transition-all active:shadow-none active:translate-x-[4px] active:translate-y-[5px] hover:bg-[#ff85b0] dark:border-[#060e20] dark:shadow-[4px_5px_0_#060e20] dark:text-[#1C1028]"
                >
                    <PartyPopper size={20}/>
                    Share the Win With Friends
                </button>

                <button
                    type="button"
                    onClick={()=>navigate("/stickers")}
                    className="text-sm text-[#6b6375] hover:text-[#091828] transition-colors dark:text-[#a0aec0]"
                >
                    Back to Album
                </button>

            </main>
        </div>
        </div>
    )
}