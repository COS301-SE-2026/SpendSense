import {useState, useEffect} from "react"
import {useNavigate} from "react-router-dom"
import {cn} from "@/lib/utils"
import {
    ArrowLeft,
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
} from "lucide-react"

// TYPES

interface BadgeDefinition{
    id: string
    code: string
    name: string
    description: string
    category: string
    criteriaType: string
    criteriaValue: number
    iconKey: string
    isActive: boolean
}

interface UserBadge{
    id: string
    userId: string
    badgeDefinitionId: string
    progress: number
    earnedAt: string|null
    metadata: Record<string, unknown>|null
    badgeDefinition: BadgeDefinition
}

// SETTING UP VARIABLES (CAPS TO DISTINGUISH)

// CATEGORY CONFIGURATION

const CATEGORY_CONFIG: Record<string, {label: string; icon: React.ReactNode}>={
    CORE_MILESTONES: {label: "Core Milestones", icon: <Award size={18}/>},
    SAVINGS_QUESTS: {label: "Savings Quests", icon: <PiggyBank size={18}/>},
    SPECIAL_EVENTS: {label: "Special Events", icon: <Sparkles size={18}/>},
    PAYMENT: {label: "Payment", icon: <CreditCard size={18}/>},
    STREAK: {label: "Streak", icon: <Flame size={18}/>},
    MILESTONE: {label: "Milestones", icon: <Star size={18}/>},
    KNOWLEDGE: {label: "Knowledge", icon: <BookOpen size={18}/>},
}

// BACKGROUND AND ICON COLOUR PER CATEGORY

const CATEGORY_BG: Record<string, string>={
    CORE_MILESTONES: "bg-[#E8D5F5]",
    SAVINGS_QUESTS: "bg-[#D6EEE8]",
    SPECIAL_EVENTS: "bg-[#1C1028]",
    PAYMENT: "bg-[#DCEFE8]",
    STREAK: "bg-[#FFD9E1]",
    MILESTONE: "bg-[#FFE7AE]",
    KNOWLEDGE: "bg-[#DCE8F7]",
}

const CATEGORY_ICON_COLOR: Record<string, string>={
    CORE_MILESTONES: "text-[#7C3AED]",
    SAVINGS_QUESTS: "text-[#0D9488]",
    SPECIAL_EVENTS: "text-white",
    PAYMENT: "text-[#16635A]",
    STREAK: "text-[#AC2A5D]",
    MILESTONE: "text-[#7A4A00]",
    KNOWLEDGE: "text-[#1E4FAE]",
}

// STICKER SHAPE PER CATEGORY
// matches the wireframe: core milestones = hexagon-ish, savings = circle, special = circle

function stickerShape(category: string, code: string): string {
    if(category === "CORE_MILESTONES"){
        // budget boss and bill slayer = hexagon shape in wireframe
        if(code === "BUDGET_BOSS") return "rounded-[28%]"
        if(code === "BILL_SLAYER") return "rounded-[28%]"
        // first quest and 7-day streak = rounded square
        return "rounded-[32%]"
    }
    return "rounded-full"
}

// STICKER ICON MAP

function StickerIcon({iconKey, size = 32}: {iconKey: string; size?: number}){
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
    }
    return <>{icons[iconKey] ?? <Star size={size}/>}</>
}

// IS NEWLY EARNED (within last 7 days)

function isNew(earnedAt: string|null):boolean{
    if(!earnedAt) return false
    return Date.now() - new Date(earnedAt).getTime() < 7 * 24 * 60 * 60 * 1000
}

// MOCK DATA
// TODO: replace with getBadges() once integrating

const MOCK_BADGES: UserBadge[] = [
    {id: "ub1", userId: "u1", badgeDefinitionId: "bd1", progress: 1, earnedAt: "2026-05-01T10:00:00Z", metadata: {xp: 50, tier: "Common"},
        badgeDefinition: {id: "bd1", code: "FIRST_QUEST", name: "First Quest", description: "Complete your first payment quest.", category: "CORE_MILESTONES", criteriaType: "QUEST_COUNT", criteriaValue: 1, iconKey: "sparkles", isActive: true},
    },
    {id: "ub2", userId: "u1", badgeDefinitionId: "bd2", progress: 7, earnedAt: "2026-05-14T09:00:00Z", metadata: {xp: 100, tier: "Uncommon"},
        badgeDefinition: {id: "bd2", code: "SEVEN_DAY_STREAK", name: "7-Day Streak", description: "Log payments 7 days in a row.", category: "CORE_MILESTONES", criteriaType: "PAYMENT_STREAK_DAYS", criteriaValue: 7, iconKey: "flame", isActive: true},
    },
    {id: "ub3", userId: "u1", badgeDefinitionId: "bd3", progress: 30, earnedAt: "2026-04-01T08:00:00Z", metadata: {xp: 150, tier: "Rare"},
        badgeDefinition: {id: "bd3", code: "BUDGET_BOSS", name: "Budget Boss", description: "Manage your budget perfectly for 30 days.", category: "CORE_MILESTONES", criteriaType: "BUDGET_DAYS", criteriaValue: 30, iconKey: "shield", isActive: true},
    },
    {id: "ub4", userId: "u1", badgeDefinitionId: "bd4", progress: 10, earnedAt: "2026-03-15T12:00:00Z", metadata: {xp: 120, tier: "Rare"},
        badgeDefinition: {id: "bd4", code: "BILL_SLAYER", name: "Bill Slayer", description: "Pay 10 bills on time in a row.", category: "CORE_MILESTONES", criteriaType: "ON_TIME_PAYMENT_COUNT", criteriaValue: 10, iconKey: "swords", isActive: true},
    },
    {id: "ub5", userId: "u1", badgeDefinitionId: "bd5", progress: 0, earnedAt: null, metadata: null,
        badgeDefinition: {id: "bd5", code: "EARLY_BIRD", name: "Early Bird", description: "Pay an obligation 3 days before it is due.", category: "CORE_MILESTONES", criteriaType: "EARLY_PAYMENT_COUNT", criteriaValue: 1, iconKey: "sunrise", isActive: true},
    },
    {id: "ub6", userId: "u1", badgeDefinitionId: "bd6", progress: 1, earnedAt: "2026-05-10T14:00:00Z", metadata: {xp: 80, tier: "Uncommon"},
        badgeDefinition: {id: "bd6", code: "RAINY_DAY", name: "Rainy Day", description: "Set aside an emergency fund.", category: "SAVINGS_QUESTS", criteriaType: "SAVINGS_GOAL_MET", criteriaValue: 1, iconKey: "umbrella", isActive: true},
    },
    {id: "ub7", userId: "u1", badgeDefinitionId: "bd7", progress: 1, earnedAt: "2026-05-18T10:00:00Z", metadata: {xp: 100, tier: "Uncommon"},
        badgeDefinition: {id: "bd7", code: "VAULT_UNLOCKER", name: "Vault Unlocker", description: "Open a savings goal and contribute to it.", category: "SAVINGS_QUESTS", criteriaType: "SAVINGS_CONTRIBUTION_COUNT", criteriaValue: 1, iconKey: "lock", isActive: true},
    },
    {id: "ub8", userId: "u1", badgeDefinitionId: "bd8", progress: 3, earnedAt: "2026-04-20T08:00:00Z", metadata: {xp: 200, tier: "Rare"},
        badgeDefinition: {id: "bd8", code: "GOAL_CRUSHER", name: "Goal Crusher", description: "Complete 3 savings goals.", category: "SAVINGS_QUESTS", criteriaType: "SAVINGS_GOAL_COMPLETED", criteriaValue: 3, iconKey: "target", isActive: true},
    },
    {id: "ub9", userId: "u1", badgeDefinitionId: "bd9", progress: 0, earnedAt: null, metadata: null,
        badgeDefinition: {id: "bd9", code: "LOCKED_SAVER_1", name: "Locked", description: "??", category: "SAVINGS_QUESTS", criteriaType: "UNKNOWN", criteriaValue: 1, iconKey: "star", isActive: true},
    },
    {id: "ub10", userId: "u1", badgeDefinitionId: "bd10", progress: 0, earnedAt: null, metadata: null,
        badgeDefinition: {id: "bd10", code: "LOCKED_SAVER_2", name: "Locked", description: "??", category: "SAVINGS_QUESTS", criteriaType: "UNKNOWN", criteriaValue: 1, iconKey: "star", isActive: true},
    },
    {id: "ub11", userId: "u1", badgeDefinitionId: "bd11", progress: 1, earnedAt: "2026-03-01T00:00:00Z", metadata: {xp: 300, tier: "Legendary"},
        badgeDefinition: {id: "bd11", code: "LAUNCH_MEMBER", name: "Launch Member", description: "One of the first SpendSense users.", category: "SPECIAL_EVENTS", criteriaType: "LAUNCH_MEMBER", criteriaValue: 1, iconKey: "star", isActive: true},
    },
    {id: "ub12", userId: "u1", badgeDefinitionId: "bd12", progress: 0, earnedAt: null, metadata: null,
        badgeDefinition: {id: "bd12", code: "HOLIDAY_SAVER", name: "Holiday Saver", description: "Save for the festive season.", category: "SPECIAL_EVENTS", criteriaType: "HOLIDAY_SAVINGS", criteriaValue: 1, iconKey: "star", isActive: true},
    },
]

// STICKER CELL

function StickerCell({badge, onPress}: {badge: UserBadge; onPress: ()=>void}){
    const def = badge.badgeDefinition
    const earned = !!badge.earnedAt
    const newBadge = isNew(badge.earnedAt)
    const shape = stickerShape(def.category, def.code)
    const bg = CATEGORY_BG[def.category] ?? "bg-[#DCEFE8]"
    const iconColor = CATEGORY_ICON_COLOR[def.category] ?? "text-[#6b6375]"
    const isSpecial = def.category === "SPECIAL_EVENTS"

    return(
        <button
        type="button"
        onClick={earned ? onPress : undefined}
        disabled={!earned}
        className={cn("flex flex-col items-center gap-2 group", !earned && "cursor-default")}
        aria-label={earned ? `${def.name} sticker, tap to view` : `${def.name} locked`}>

            <div className="relative">
                {newBadge &&(
                    <span
                        className="absolute -top-1 -right-1 z-10 size-3.5 rounded-full bg-[#FF3B5C] border-2 border-white"
                        aria-label="newly earned"
                    />
                )}
                {earned ?
                (
                <div className={cn(
                    "size-[88px] flex items-center justify-center transition-transform group-hover:scale-105 group-active:scale-95",
                    shape,
                    bg,
                    isSpecial && "border-[3px] border-[#2D1B4E]"
                )}>
                    <span className={iconColor}>
                        <StickerIcon iconKey={def.iconKey} size={isSpecial ? 36 : 30}/>
                    </span>
                </div>
                )
                :
                (
                <div className="size-[88px] rounded-full border-2 border-dashed border-[#B8CBBF] bg-transparent flex items-center justify-center">
                    <HelpCircle size={26} className="text-[#B8CBBF]"/>
                </div>
                )}
            </div>

            <span className={cn(
                "text-xs font-semibold text-center leading-tight w-[88px]",
                earned ? "text-[#091828]" : "text-[#B8CBBF]"
            )}>
                {earned ? def.name : "Locked"}
            </span>
        </button>
    )
}

// CATEGORY SECTION

function CategorySection({category, badges, onSelect}:{
    category: string
    badges: UserBadge[]
    onSelect: (b: UserBadge)=>void
}){
    const config = CATEGORY_CONFIG[category] ?? {label: category, icon: <Star size={18}/>}

    return(
        <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#091828] flex items-center gap-2">
                {config.label}
                <span className="text-[#6b6375]">{config.icon}</span>
            </h2>
            {/* 2-column grid matching the wireframe */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                {badges.map(b=>(
                    <div key={b.id} className="flex justify-center">
                        <StickerCell badge={b} onPress={()=>onSelect(b)}/>
                    </div>
                ))}
            </div>
        </section>
    )
}

// MAIN PAGE

export default function StickerAlbumPage(){
    const navigate = useNavigate()
    const [badges, setBadges] = useState<UserBadge[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(()=>{
        // TODO: replace this with the api call when integrating
        setTimeout(()=>{
            setBadges(MOCK_BADGES)
            setLoading(false)
        }, 400)
    }, [])

    const earned = badges.filter(b=>!!b.earnedAt)
    const total = badges.length
    const completionPct = total > 0 ? Math.round((earned.length / total) * 100) : 0

    const categoryOrder=[
        "CORE_MILESTONES",
        "SAVINGS_QUESTS",
        "SPECIAL_EVENTS",
        "PAYMENT",
        "STREAK",
        "MILESTONE",
        "KNOWLEDGE",
    ]

    const grouped = categoryOrder
        .map(cat=>({cat, items: badges.filter(b=>b.badgeDefinition.category === cat)}))
        .filter(g=>g.items.length > 0)

    return(
        // mobile-width centred container
        <div className="min-h-screen bg-[#F0F7F4] flex flex-col items-center">
        <div className="w-full max-w-sm flex flex-col min-h-screen">

            {/* HEADER */}
            <header className="bg-[#F0F7F4] px-4 pt-5 pb-3 flex items-center justify-between">
                <button
                type="button"
                onClick={()=>navigate(-1)}
                className="size-9 flex items-center justify-center rounded-full bg-white/80 text-[#091828] shadow-sm"
                aria-label="Go back">

                    <ArrowLeft size={20}/>
                </button>
                <h1 className="text-base font-bold text-[#091828]">Sticker Album</h1>
                <button
                type="button"
                className="size-9 flex items-center justify-center rounded-full bg-white/80 text-[#091828] shadow-sm"
                aria-label="Search stickers">

                    <Search size={20}/>
                </button>
            </header>

            <main className="flex-1 px-4 pb-24 space-y-8 overflow-y-auto">

                {/* PROGRESS HERO - matches wireframe typography */}
                <div className="pt-2 pb-2 text-center space-y-2">
                    <div>
                        <p className="text-5xl font-black text-[#091828] leading-none">
                            {earned.length} / {total}
                        </p>
                        <p className="text-2xl font-bold text-[#091828] mt-1">Stickers Found</p>
                    </div>
                    <div className="space-y-1 px-2">
                        <div className="h-2.5 w-full rounded-full bg-[#D9EDE7] overflow-hidden">
                            <div
                                className="h-full rounded-full bg-[#3DBFA0] transition-[width] duration-700"
                                style={{width: `${completionPct}%`}}/>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6375]">
                            Completion: {completionPct}%
                        </p>
                    </div>
                </div>

                {/* BADGE SECTIONS */}
                {loading?(
                    <div className="space-y-8">
                        {[4, 4, 2].map((n, i)=>(
                            <div key={i} className="space-y-4">
                                <div className="h-7 w-40 rounded-full bg-[#D9EDE7] animate-pulse"/>
                                <div className="grid grid-cols-2 gap-6">
                                    {Array.from({length: n}).map((_, j)=>(
                                        <div key={j} className="flex justify-center">
                                            <div className="size-[88px] rounded-full bg-[#D9EDE7] animate-pulse"/>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )
                :
                (
                    grouped.map(({cat, items})=>(
                        <CategorySection
                        key={cat}
                        category={cat}
                        badges={items}
                        onSelect={(b)=>navigate(`/stickers/${b.id}`)}/>
                    ))
                )}
            </main>

        </div>
        </div>
    )
}
