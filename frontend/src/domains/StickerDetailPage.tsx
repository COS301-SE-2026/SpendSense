import {useNavigate} from "react-router-dom"
import {cn} from "@/lib/utils"
import {
    ArrowLeft,
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
    CORE_MILESTONES: "bg-[#F2D8FF]",
    SAVINGS_QUESTS: "bg-[#D6EEE8]",
    SPECIAL_EVENTS: "bg-[#1C1028]",
    PAYMENT: "bg-[#DCEFE8]",
    STREAK: "bg-[#FFD9E1]",
    MILESTONE: "bg-[#FFE7AE]",
    KNOWLEDGE: "bg-[#DCE8F7]",
    SCORE: "bg-[#FFE7AE]",
}

const CATEGORY_ICON_COLOR: Record<string, string>={
    CORE_MILESTONES: "text-[#7C3AED]",
    SAVINGS_QUESTS: "text-[#0D9488]",
    SPECIAL_EVENTS: "text-white",
    PAYMENT: "text-[#16635A]",
    STREAK: "text-[#AC2A5D]",
    MILESTONE: "text-[#7A4A00]",
    KNOWLEDGE: "text-[#1E4FAE]",
    SCORE: "text-[#7A4A00]",
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
    Common: {bg: "bg-[#E8EFEC]", text: "text-[#091828]", icon: <Sparkles size={14}/>},
    Uncommon: {bg: "bg-[#D6EEE8]", text: "text-[#16635A]", icon: <Star size={14}/>},
    Rare: {bg: "bg-[#E0B0FF]", text: "text-[#6E0034]", icon: <Award size={14}/>},
    Legendary: {bg: "bg-[#FFE7AE]", text: "text-[#7A4A00]", icon: <Diamond size={14}/>},
}

// ICONS

function StickerIconLarge({iconKey, category}: {iconKey: string; category: string}){
    const color = CATEGORY_ICON_COLOR[category] ?? "text-[#6b6375]"
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
            <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="text-[#091828] font-bold text-lg">Sticker not found</p>
                <p className="text-sm text-[#6b6375]">Navigate from the sticker album to view badge details.</p>
                <button
                    type="button"
                    onClick={()=>navigate("/stickers")}
                    className="text-sm text-[#AC2A5D] underline"
                >
                    Back to Album
                </button>
            </div>
        )
    }

    void badgeKey // used in URL for shareability, badge data comes from state

    const stickerBg = CATEGORY_BG[badge.category] ?? "bg-[#DCEFE8]"
    const tier = CATEGORY_TIER[badge.category] ?? "Common"
    const tierStyle = TIER_STYLE[tier] ?? TIER_STYLE["Common"]

    const earnedDate = badge.earnedAt
        ? new Date(badge.earnedAt).toLocaleDateString("en-ZA",{
            day: "numeric",
            month: "short",
            year: "numeric",
        }) : ""

    return(
        <div className="min-h-screen bg-[#F0F7F4] flex flex-col items-center">
        <div className="w-full max-w-sm flex flex-col min-h-screen">

            <header className="px-5 pt-5 flex items-center justify-between">
                <button
                    type="button"
                    onClick={()=>navigate("/stickers")}
                    className="size-9 flex items-center justify-center rounded-full bg-white/60 text-[#091828]"
                    aria-label="Go back"
                >
                    <ArrowLeft size={20}/>
                </button>
                <h1 className="text-base font-bold text-[#091828]">Quest Reward</h1>
                <button
                    type="button"
                    className="size-9 flex items-center justify-center rounded-full bg-white/60 text-[#091828]"
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
                    <div className="w-52 h-52 rounded-[2rem] bg-white border-[3px] border-[#091828] shadow-[4px_5px_0_#091828] flex items-center justify-center">
                        <div className={cn("size-36 rounded-full flex items-center justify-center", stickerBg)}>
                            <StickerIconLarge iconKey={badge.iconKey ?? 'star'} category={badge.category}/>
                        </div>
                    </div>
                </div>

                <h2 className="text-3xl font-black text-[#091828] text-center">{badge.name}</h2>

                <div className="bg-[#FFE7AE] rounded-full px-5 py-2 border border-[#F2BF3C]/50">
                    <p className="text-sm font-bold text-[#7A4A00]">Earned on {earnedDate}</p>
                </div>

                <p className="text-center text-[#091828] text-base leading-relaxed font-medium px-2">
                    &quot;{badge.description}&quot;
                </p>

                <div className="flex items-center gap-3">
                    <div className={cn(
                        "flex items-center gap-1.5 rounded-full border-2 border-[#091828] shadow-[2px_3px_0_#091828] px-4 py-2",
                        tierStyle.bg,
                        tierStyle.text,
                    )}>
                        <span>{tierStyle.icon}</span>
                        <span className="text-sm font-bold">{tier} Tier</span>
                    </div>
                </div>

                <button
                    type="button"
                    className="w-full rounded-full bg-[#FF6B9D] border-2 border-[#091828] shadow-[4px_5px_0_#091828] py-4 text-lg font-bold text-[#700034] flex items-center justify-center gap-2 transition-all active:shadow-none active:translate-x-[4px] active:translate-y-[5px] hover:bg-[#ff85b0]"
                >
                    <PartyPopper size={20}/>
                    Share the Win With Friends
                </button>

                <button
                    type="button"
                    onClick={()=>navigate("/stickers")}
                    className="text-sm text-[#6b6375] hover:text-[#091828] transition-colors"
                >
                    Back to Album
                </button>

            </main>
        </div>
        </div>
    )
}
