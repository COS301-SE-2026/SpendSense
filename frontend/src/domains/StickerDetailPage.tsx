import {useState, useEffect} from "react"
import {useNavigate, useParams} from "react-router-dom"
import {cn} from "@/lib/utils"
import{
    ArrowLeft01Icon,
    Share01Icon,
    SparklesIcon,
    Fire02Icon,
    Shield01Icon,
    Sword01Icon,
    SunriseIcon,
    UmbrellaIcon,
    LockIcon,
    Target01Icon,
    StarIcon,
    Award01Icon,
    Medal01Icon,
    ZapIcon,
    CheckmarkCircle01Icon,
    DiamondIcon,
    PartyIcon,
    Sparkles01Icon,
} from "@hugeicons/react"
 
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
    earnedAt: string | null
    metadata: Record<string, unknown> | null
    badgeDefinition: BadgeDefinition
}

// SETTING UP THE VARIABLES (IN ALL CAPS TO DISTINGUIHS)

// CATEGORY COLOURS
 
const CATEGORY_BG: Record<string, string>={
    CORE_MILESTONES: "bg-[#F2D8FF]",
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
 
// TIER STYLING
 
const TIER_STYLE: Record<string, {bg: string; text: string; icon: React.ReactNode}>={
    Common: {bg: "bg-[#E8EFEC]", text: "text-[#091828]", icon: <SparklesIcon size={14}/>},
    Uncommon: {bg: "bg-[#D6EEE8]", text: "text-[#16635A]", icon: <StarIcon size={14}/>},
    Rare: {bg: "bg-[#E0B0FF]", text: "text-[#6E0034]", icon: <Award01Icon size={14}/>},
    Legendary: {bg: "bg-[#FFE7AE]", text: "text-[#7A4A00]", icon: <DiamondIcon size={14}/>},
}
 
// LARGE STICKER ICONS
 
function StickerIconLarge({iconKey, category}: {iconKey: string; category: string}){
    const color = CATEGORY_ICON_COLOR[category] ?? "text-[#6b6375]"
    const size = 64
    
    const icons: Record<string, React.ReactNode>={
        sparkles: <SparklesIcon size={size}/>,
        flame: <Fire02Icon size={size}/>,
        shield: <Shield01Icon size={size}/>,
        swords: <Sword01Icon size={size}/>,
        sunrise: <SunriseIcon size={size}/>,
        umbrella: <UmbrellaIcon size={size}/>,
        lock: <LockIcon size={size}/>,
        target: <Target01Icon size={size}/>,
        star: <StarIcon size={size}/>,
        award: <Award01Icon size={size}/>,
        medal: <Medal01Icon size={size}/>,
        zap: <ZapIcon size={size}/>,
        check: <CheckmarkCircle01Icon size={size}/>,
    }
    
    return(
        <span className={color}>
        {icons[iconKey] ?? <StarIcon size={size}/>}
        </span>
    )
}
 
// SPARKLE
 
function SparkleDecor({className, color = "#F2BF3C", size = 20}:{
    className?: string
    color?: string
    size?: number
}){
    return (
        <svg
        width={size}
        height={size}
        viewBox="0 0 20 20"
        fill="none"
        className={className}
        aria-hidden="true">

        <path
            d="M10 2l1.2 5.8L17 10l-5.8 1.2L10 18l-1.2-6.8L3 10l6.8-1.2L10 2z"
            fill={color}
            opacity=".9"/>
            
        </svg>
    )
}
 
// replace with getBadges()

async function fetchBadgeById(id: string): Promise<UserBadge|null>{
    const MOCK: UserBadge[]=[
        {id: "ub3", userId: "u1", badgeDefinitionId: "bd3", progress: 30,
        earnedAt: "2023-10-12T08:00:00Z", metadata: {xp: 150, tier: "Rare"},
        badgeDefinition: {id: "bd3", code: "BUDGET_BOSS", name: "Budget Boss", description: "You made it 30 days without using your savings. The vault is proud.", category: "CORE_MILESTONES", criteriaType: "BUDGET_DAYS", criteriaValue: 30, iconKey: "shield", isActive: true},
        },

        {id: "ub1", userId: "u1", badgeDefinitionId: "bd1", progress: 1,
        earnedAt: "2026-05-01T10:00:00Z", metadata: {xp: 50, tier: "Common"},
        badgeDefinition: {id: "bd1", code: "FIRST_QUEST", name: "First Quest", description: "This is your first win. Every great experience starts with one.", category: "CORE_MILESTONES", criteriaType: "QUEST_COUNT", criteriaValue: 1, iconKey: "sparkles", isActive: true},
        },

        {id: "ub2", userId: "u1", badgeDefinitionId: "bd2", progress: 7,
        earnedAt: "2026-05-14T09:00:00Z", metadata: {xp: 100, tier: "Uncommon"},
        badgeDefinition: {id: "bd2", code: "SEVEN_DAY_STREAK", name: "7-Day Streak", description: "Seven days straight, no breaks. Keep that streak going.", category: "CORE_MILESTONES", criteriaType: "PAYMENT_STREAK_DAYS", criteriaValue: 7, iconKey: "flame", isActive: true},
        },

        {id: "ub4", userId: "u1", badgeDefinitionId: "bd4", progress: 10,
        earnedAt: "2026-03-15T12:00:00Z", metadata: {xp: 120, tier: "Rare"},
        badgeDefinition: {id: "bd4", code: "BILL_SLAYER", name: "Bill Slayer", description: "Ten bills paid on time. Your future self will appreciate this.", category: "CORE_MILESTONES", criteriaType: "ON_TIME_PAYMENT_COUNT", criteriaValue: 10, iconKey: "swords", isActive: true},
        },

        {id: "ub6", userId: "u1", badgeDefinitionId: "bd6", progress: 1,
        earnedAt: "2026-05-10T14:00:00Z", metadata: {xp: 80, tier: "Uncommon"},
        badgeDefinition: {id: "bd6", code: "RAINY_DAY", name: "Rainy Day", description: "You've started making your safety net. This is a big step.", category: "SAVINGS_QUESTS", criteriaType: "SAVINGS_GOAL_MET", criteriaValue: 1, iconKey: "umbrella", isActive: true},
        },

        {id: "ub7", userId: "u1", badgeDefinitionId: "bd7", progress: 1,
        earnedAt: "2026-05-18T10:00:00Z", metadata: {xp: 100, tier: "Uncommon"},
        badgeDefinition: {id: "bd7", code: "VAULT_UNLOCKER", name: "Vault Unlocker", description: "The vault is open. Time to start saving.", category: "SAVINGS_QUESTS", criteriaType: "SAVINGS_CONTRIBUTION_COUNT", criteriaValue: 1, iconKey: "lock", isActive: true},
        },

        {id: "ub8", userId: "u1", badgeDefinitionId: "bd8", progress: 3,
        earnedAt: "2026-04-20T08:00:00Z", metadata: {xp: 200, tier: "Rare"},
        badgeDefinition: {id: "bd8", code: "GOAL_CRUSHER", name: "Goal Crusher", description: "Three saving goals done. You're getting good'.", category: "SAVINGS_QUESTS", criteriaType: "SAVINGS_GOAL_COMPLETED", criteriaValue: 3, iconKey: "target", isActive: true},
        },

        {id: "ub11", userId: "u1", badgeDefinitionId: "bd11", progress: 1,
        earnedAt: "2026-03-01T00:00:00Z", metadata: {xp: 300, tier: "Legendary"},
        badgeDefinition: {id: "bd11", code: "LAUNCH_MEMBER", name: "Launch Member", description: "You were here from the beginning. One of the first in the SpendSense community.", category: "SPECIAL_EVENTS", criteriaType: "LAUNCH_MEMBER", criteriaValue: 1, iconKey: "star", isActive: true},
        },
    ]

    await new Promise(r=>setTimeout(r, 300))
    return MOCK.find(b=>b.id === id) ?? null
}
 
// MAIN PAGE
 
export default function StickerDetailPage(){
    const {badgeId} = useParams<{badgeId: string}>()
    const navigate = useNavigate()
    const [badge, setBadge] = useState<UserBadge|null>(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    
    useEffect(()=>{
        if(!badgeId){
            return
        }
        
        fetchBadgeById(badgeId)
        .then(b=>{if(b) setBadge(b); 
            else setNotFound(true)})
        .catch(()=>setNotFound(true))
        .finally(()=>setLoading(false))
    }, [badgeId])
    
    if(loading){
        return(
            <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
                <div className="size-16 rounded-3xl bg-[#E8EFEC] animate-pulse" />
            </div>
        )
    }
    
    if(notFound || !badge){
        return(
            <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="text-[#091828] font-bold text-lg">Sticker not found</p>
                <button
                type="button"
                onClick={() => navigate("/stickers")}
                className="text-sm text-[#AC2A5D] underline">

                Back to Album
                </button>
            </div>
        )
    }
    
    const def = badge.badgeDefinition
    const xp = (badge.metadata?.xp as number | undefined) ?? 0
    const tier = (badge.metadata?.tier as string | undefined) ?? "Common"
    const tierStyle = TIER_STYLE[tier] ?? TIER_STYLE["Common"]
    const stickerBg = CATEGORY_BG[def.category] ?? "bg-[#DCEFE8]"
    
    const earnedDate = badge.earnedAt ? 
        new Date(badge.earnedAt).toLocaleDateString("en-ZA",{
            day: "numeric",
            month: "short",
            year: "numeric",
        }) : ""
    
    return(
        <div className="min-h-screen bg-[#F5F0E8]">
        <header className="px-5 pt-5 flex items-center justify-between">
            <button
            type="button"
            onClick={() => navigate("/stickers")}
            className="size-9 flex items-center justify-center rounded-full bg-white/60 text-[#091828]"
            aria-label="Go back">

            <ArrowLeft01Icon size={20}/>
            </button>
            <h1 className="text-base font-bold text-[#091828]">Quest Reward</h1>
            <button
            type="button"
            className="size-9 flex items-center justify-center rounded-full bg-white/60 text-[#091828]"
            aria-label="Share" >

            {/* iimplement sharing features once thats done */}
            <Share01Icon size={20}/>
            </button>
        </header>
    
        <main className="px-6 pt-6 pb-12 flex flex-col items-center gap-6 max-w-sm mx-auto">
    
            {/* sparkly stcker  */}
            <div className="relative">
            <SparkleDecor className="absolute -top-3 -right-2" color="#F2BF3C" size={24}/>
            <SparkleDecor className="absolute top-4 -right-6" color="#F2BF3C" size={16}/>
            <SparkleDecor className="absolute -bottom-2 -left-5" color="#FF6B9D" size={20}/>
            <SparkleDecor className="absolute bottom-6 -left-7" color="#FF6B9D" size={13}/>
    
            <div className="w-52 h-52 rounded-[2rem] bg-white border-[3px] border-[#091828] shadow-[4px_5px_0_#091828] flex items-center justify-center">
                <div className={cn("size-36 rounded-full flex items-center justify-center", stickerBg)}>
                <StickerIconLarge iconKey={def.iconKey} category={def.category}/>
                </div>
            </div>
            </div>
    
            <h2 className="text-3xl font-black text-[#091828] text-center">{def.name}</h2>
    
            {/* earned date */}
            <div className="bg-[#FFE7AE] rounded-full px-5 py-2 border border-[#F2BF3C]/50">
            <p className="text-sm font-bold text-[#7A4A00]">Earned on {earnedDate}</p>
            </div>
    
            <p className="text-center text-[#091828] text-base leading-relaxed font-medium px-2">
            "{def.description}"
            </p>
    
            {/* xp and tier */}
            <div className="flex items-center gap-3">
            {xp > 0 &&(
                <div className="flex items-center gap-1.5 rounded-full bg-[#FFE7AE] border-2 border-[#091828] shadow-[2px_3px_0_#091828] px-4 py-2">
                <Sparkles01Icon size={14} className="text-[#7A4A00]"/>
                <span className="text-sm font-bold text-[#091828]">+{xp} XP</span>
                </div>
            )}
            <div className={cn(
                "flex items-center gap-1.5 rounded-full border-2 border-[#091828] shadow-[2px_3px_0_#091828] px-4 py-2",
                tierStyle.bg,
                tierStyle.text)}>

                <span>{tierStyle.icon}</span>
                <span className="text-sm font-bold">{tier} Tier</span>
            </div>
            </div>
    
            {/* share button, implement once share implemented */}
            <button
            type="button"
            className="w-full rounded-full bg-[#FF6B9D] border-2 border-[#091828] shadow-[4px_5px_0_#091828] py-4 text-lg font-bold text-[#700034] flex items-center justify-center gap-2 transition-all active:shadow-none active:translate-x-[4px] active:translate-y-[5px] hover:bg-[#ff85b0]">

            <PartyIcon size={20}/>
            Share the Win With Friends
            </button>
    
            <button
            type="button"
            onClick={() => navigate("/stickers")}
            className="text-sm text-[#6b6375] hover:text-[#091828] transition-colors">

            Back to Album
            </button>
    
        </main>
        </div>
    )
}