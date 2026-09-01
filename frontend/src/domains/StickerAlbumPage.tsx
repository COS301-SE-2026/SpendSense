import {useNavigate, useLocation} from "react-router-dom"
import {cn} from "@/lib/utils"
import {
    ChevronLeft,
    Search,
    Award,
    PiggyBank,
    Sparkles,
    CreditCard,
    Flame,
    Star,
    BookOpen,
    HelpCircle,
    Shield,
    Sword,
    Sunrise,
    Umbrella,
    Lock,
    Target,
    Medal,
    Zap,
    CheckCircle,
    AlertTriangle,
} from "lucide-react"
import {useGamificationProfile, type GamificationBadge} from "@/hooks/useGamificationProfile"

// TYPES

// badges not in this list that come back from the api are still displayed
const ALL_BADGE_KEYS: Record<string, {name: string; iconKey: string; category: string; description: string}>={
    FIRST_OBLIGATION_CREATED: {name: "First Obligation", iconKey: "sparkles", category: "CORE_MILESTONES", description: "Created your first tracked financial obligation."},
    FIRST_ON_TIME_PAYMENT: {name: "On-Time Starter", iconKey: "check", category: "PAYMENT", description: "Logged your first on-time payment."},
    THREE_PAYMENT_STREAK: {name: "Three Payment Streak", iconKey: "flame", category: "STREAK", description: "Reached a three-payment on-time streak."},
    SCORE_650_REACHED: {name: "Excellent Progress", iconKey: "trending-up", category: "SCORE",  description: "Reached a simulated financial health score of 650."},
    DEMO_READY:  {name: "Demo Ready", iconKey: "sparkles", category: "SPECIAL_EVENTS", description: "Seeded profile for a complete Demo 1 walkthrough."},
}

// CATEGORY CONFIGURATION

const CATEGORY_CONFIG: Record<string, {label: string; icon: React.ReactNode}>={
    CORE_MILESTONES: {label: "Core Milestones", icon: <Award size={18}/>},
    SAVINGS_QUESTS: {label: "Savings Quests", icon: <PiggyBank size={18}/>},
    SPECIAL_EVENTS: {label: "Special Events", icon: <Sparkles size={18}/>},
    PAYMENT: {label: "Payment", icon: <CreditCard size={18}/>},
    STREAK: {label: "Streak", icon: <Flame size={18}/>},
    MILESTONE: {label: "Milestones", icon: <Star size={18}/>},
    KNOWLEDGE: {label: "Knowledge", icon: <BookOpen size={18}/>},
    SCORE: {label: "Score", icon: <Star size={18}/>},
}

const CATEGORY_BG: Record<string, string>={
    CORE_MILESTONES: "bg-[#E8D5F5] dark:bg-[#332352]",
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

function stickerShape(category: string, code: string): string{
    if(category === "CORE_MILESTONES"){
        if(code === "BUDGET_BOSS") return "rounded-[28%]"
        if(code === "BILL_SLAYER") return "rounded-[28%]"
        return "rounded-[32%]"
    }
    return "rounded-full"
}

function StickerIcon({iconKey, size = 32}: {iconKey: string; size?: number}){
    const icons: Record<string, React.ReactNode> = {
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
    return <>{icons[iconKey] ?? <Star size={size}/>}</>
}

function isNew(earnedAt: string|null): boolean{
    if(!earnedAt) return false
    return Date.now() - new Date(earnedAt).getTime() < 7 * 24 * 60 * 60 * 1000
}


// STICKER CELL

function StickerCell({badge, isEarned, onPress}: {
    badge: GamificationBadge | {badgeKey: string; name: string; iconKey: string; category: string; description: string; earnedAt: null}
    isEarned: boolean
    onPress: ()=>void
}){
    const earnedAt = 'earnedAt' in badge ? badge.earnedAt : null
    const newBadge = isNew(earnedAt)
    const shape = stickerShape(badge.category, badge.badgeKey)
    const bg = CATEGORY_BG[badge.category] ?? "bg-[#DCEFE8] dark:bg-[#12463d]"
    const iconColor = CATEGORY_ICON_COLOR[badge.category] ?? "text-[#6b6375] dark:text-[#a0aec0]"
    const isSpecial = badge.category === "SPECIAL_EVENTS"

    return(
        <button
            type="button"
            onClick={isEarned ? onPress : undefined}
            disabled={!isEarned}
            className={cn("flex flex-col items-center gap-2 group", !isEarned && "cursor-default")}
            aria-label={isEarned ? `${badge.name} sticker, tap to view` : `${badge.name} locked`}
        >
            <div className="relative">
                {newBadge && (
                    <span
                        className="absolute -top-1 -right-1 z-10 size-3.5 rounded-full bg-[#FF3B5C] border-2 border-white dark:border-[#2d3449]"
                        aria-label="newly earned"
                    />
                )}
                {isEarned ? (
                    <div className={cn(
                        "size-[88px] flex items-center justify-center transition-transform group-hover:scale-105 group-active:scale-95",
                        shape,
                        bg,
                        isSpecial && "border-[3px] border-[#2D1B4E] dark:border-[#6b4f9e]"
                    )}>
                        <span className={iconColor}>
                            <StickerIcon iconKey={badge.iconKey ?? 'star'} size={isSpecial ? 36 : 30}/>
                        </span>
                    </div>
                ) : (
                    <div className="size-[88px] rounded-full border-2 border-dashed border-[#B8CBBF] bg-transparent flex items-center justify-center dark:border-[#2d3449]">
                        <HelpCircle size={26} className="text-[#B8CBBF] dark:text-[#a0aec0]"/>
                    </div>
                )}
            </div>
            <span className={cn(
                "text-xs font-semibold text-center leading-tight w-[88px]",
                isEarned ? "text-[#091828] dark:text-[#ffffff]" : "text-[#B8CBBF] dark:text-[#a0aec0]"
            )}>
                {isEarned ? badge.name : "Locked"}
            </span>
        </button>
    )
}


// CATEGORY SECTION

function CategorySection({category, badges, earnedKeys, onSelect}: {
    category: string
    badges: (GamificationBadge|{badgeKey: string; name: string; iconKey: string; category: string; description: string; earnedAt: null})[]
    earnedKeys: Set<string>
    onSelect: (b: GamificationBadge)=>void
}){
    const config = CATEGORY_CONFIG[category] ?? {label: category, icon: <Star size={18}/>}

    return(
        <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#091828] flex items-center gap-2 dark:text-[#ffffff]">
                {config.label}
                <span className="text-[#6b6375] dark:text-[#a0aec0]">{config.icon}</span>
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                {badges.map(b=>(
                    <div key={b.badgeKey} className="flex justify-center">
                        <StickerCell
                            badge={b}
                            isEarned={earnedKeys.has(b.badgeKey)}
                            onPress={()=>{
                                if(earnedKeys.has(b.badgeKey)){
                                    onSelect(b as GamificationBadge)
                                }
                            }}
                        />
                    </div>
                ))}
            </div>
        </section>
    )
}


// MAIN PAGE

export default function StickerAlbumPage(){
    const nav = useNavigate()
    const location = useLocation()
    const {profile, loading, error} = useGamificationProfile()

    const goBack = () => {
        if (location.key !== "default") {
            nav(-1)
        } else {
            nav("/")
        }
    }

    const earnedBadges = profile?.badges ?? []
    const earnedKeys = new Set(earnedBadges.map(b => b.badgeKey))

    const allBadgeEntries = Object.entries(ALL_BADGE_KEYS).map(([key, def])=>({
        badgeKey: key,
        ...def,
        earnedAt: earnedBadges.find(b => b.badgeKey === key)?.earnedAt ?? null,
    }))

    // also include any earned badges not in the curr static list
    const extraEarned = earnedBadges.filter(b => !ALL_BADGE_KEYS[b.badgeKey])
    const allBadges = [...allBadgeEntries, ...extraEarned]

    const total = allBadges.length
    const earnedCount = earnedBadges.length
    const completionPct = total > 0 ? Math.round((earnedCount / total) * 100) : 0

    const categoryOrder = [
        "CORE_MILESTONES",
        "PAYMENT",
        "STREAK",
        "SCORE",
        "SAVINGS_QUESTS",
        "SPECIAL_EVENTS",
        "MILESTONE",
        "KNOWLEDGE",
    ]

    const grouped = categoryOrder
        .map(cat=>({cat, items: allBadges.filter(b => b.category === cat)}))
        .filter(g => g.items.length > 0)

    return(
        <div className="min-h-screen bg-[#F0F7F4] flex flex-col items-center dark:bg-[#0b1326]">
        <div className="w-full max-w-sm flex flex-col min-h-screen">

            {/* HEADER */}
            <header className="bg-[#F0F7F4] px-4 pt-5 pb-3 flex items-center justify-between dark:bg-[#1c263c]">
                <button type="button" aria-label="Go back" onClick={goBack} className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FF6B9D] shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#ffb1c5] dark:shadow-[4px_4px_0_#060e20]">
                        <ChevronLeft className="size-5 text-[#6E0034] dark:text-[#650030]" />
                </button>
                <div className="flex flex-1 items-center justify-center">
                    <div
                        className="rounded-full border-2 border-[#091828] bg-white px-7 py-2.5 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#ffb1c5] dark:shadow-[4px_4px_0_#ff6b9d]"
                        style={{transform: "rotate(-3deg)"}}>
                            
                        <span className="text-base font-bold text-[#091828] dark:text-[#091828]">Sticker Album</span>
                    </div>
                </div>                <button
                    type="button"
                    className="size-9 flex items-center justify-center rounded-full bg-white/80 text-[#091828] shadow-sm dark:text-[#ffffff]"
                    aria-label="Search stickers"
                >
                    <Search size={20}/>
                </button>
            </header>

            <main className="flex-1 px-4 pb-24 space-y-8 overflow-y-auto">

                {/* error banner */}
                {error && (
                    <div className="flex items-center gap-2 rounded-2xl border-2 border-[#AC2A5D] bg-[#FFD9E1] px-4 py-3 dark:border-[#ff6b9d] dark:bg-[#2d1b2e]">
                        <AlertTriangle className="size-4 shrink-0 text-[#AC2A5D] dark:text-[#ff6b9d]"/>
                        <p className="text-sm font-semibold text-[#AC2A5D] dark:text-[#ff6b9d]">{error}</p>
                    </div>
                )}

                {/* PROGRESS HERO */}
                <div className="pt-2 pb-2 text-center space-y-2">
                    <div>
                        <p className="text-5xl font-black text-[#091828] leading-none dark:text-[#ffffff]">
                            {loading ? '-' : earnedCount} / {loading ? '-' : total}
                        </p>
                        <p className="text-2xl font-bold text-[#091828] mt-1 dark:text-[#ffffff]">Stickers Found</p>
                    </div>
                    <div className="space-y-1 px-2">
                        <div className="h-2.5 w-full rounded-full bg-[#D9EDE7] overflow-hidden dark:bg-[#1c263c]">
                            <div
                                className="h-full rounded-full bg-[#3DBFA0] transition-[width] duration-700"
                                style={{width: `${completionPct}%`}}
                            />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6375] dark:text-[#a0aec0]">
                            Completion: {completionPct}%
                        </p>
                    </div>
                </div>

                {/* BADGE SECTIONS */}
                {loading ? (
                    <div className="space-y-8">
                        {[4, 4, 2].map((n, i)=>(
                            <div key={i} className="space-y-4">
                                <div className="h-7 w-40 rounded-full bg-[#D9EDE7] animate-pulse dark:bg-[#1c263c]"/>
                                <div className="grid grid-cols-2 gap-6">
                                    {Array.from({length: n}).map((_, j)=>(
                                        <div key={j} className="flex justify-center">
                                            <div className="size-[88px] rounded-full bg-[#D9EDE7] animate-pulse dark:bg-[#1c263c]"/>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    grouped.map(({cat, items})=>(
                        <CategorySection
                            key={cat}
                            category={cat}
                            badges={items}
                            earnedKeys={earnedKeys}
                            onSelect={(b)=>nav(`/stickers/${b.badgeKey}`, {state: {badge: b}})}
                        />
                    ))
                )}

            </main>

        </div>
        </div>
    )
}