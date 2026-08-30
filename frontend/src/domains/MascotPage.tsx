import {Link} from "react-router-dom"
import {
    Coins,
    Flame,
    ShoppingBag,
    Sparkles,
    Star,
} from "lucide-react"

import {CustomCard} from "@/components/ui/CustomCard"
import {Progress} from "@/components/ui/progress"
import {LongButton} from "@/components/common/LongButton"
import {SubPageShell} from "@/components/common/SubPageShell"
import {SectionHeader} from "@/components/common/SectionHeader"
import {StatTile} from "@/components/common/StatTile"
import {ErrorCard, LoadingCard} from "@/components/common/AsyncStates"
import {MascotAvatar} from "@/components/mascot/MascotAvatar"
import {MascotHubNav} from "@/components/mascot/MascotHubNav"
import {useGamificationProfile} from "@/hooks/useGamificationProfile"
import {
	calculateLevelProgress,
	calculateMascotLevel,
	isMascotMood,
	moodMetaFor,
	type MascotMood,
} from "@/lib/mascot"
 

export default function MascotPage(){
    const {profile, loading, error, refetch} = useGamificationProfile()

    if (loading) {
		return (
			<SubPageShell title="Mascot Home">
				<LoadingCard label="Loading your mascot" />
			</SubPageShell>
		)
	}

    if(error || !profile){
        return (
            <SubPageShell title="Mascot Home">
                <ErrorCard message={error ?? "Your mascot is out of reach right now."} onRetry={refetch}/>

                <LongButton LongVariant="primaryDark" LongSize="md" showArrow={false} asChild>
                    <Link to="/profile">Back to Profile</Link>
                </LongButton>
            </SubPageShell>
        )
    }

    const mood: MascotMood = isMascotMood(profile?.mascotMood) ? profile.mascotMood: "NEUTRAL"
    const moodMeta = moodMetaFor(profile?.mascotMood)

    const xp = profile?.xp ?? 0
    const level = profile?.mascotLevel ?? calculateMascotLevel(xp)
    const progress = profile?.mascotLevelProgress ?? calculateLevelProgress(xp)
    const equipped = profile?.equippedCosmetics ?? []
    const moodReason = profile?.moodReason ?? null

    return(
        <SubPageShell title="Mascot Home" subtitle="Your mascot. Your space. Your journey.">
			{/* level and mood pills, image 6's two floating badges. no mood score or level
			    title, neither exists on GET /gamification/profile */}
			<div className="flex items-stretch gap-3">
				<CustomCard variant="navyBorder" size="sm" className="flex-1 min-h-0 py-3">
					<div className="flex items-center gap-2">
						<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#E8E4F4] text-[#5B4D8B] dark:bg-[#2a2545] dark:text-[#c4b5fd]">
							<Star className="size-4" aria-hidden="true" />
						</span>
						<span className="leading-tight">
							<span className="block text-sm font-extrabold text-[#091828] dark:text-white">
								Level {level}
							</span>
							<span className="block text-[10px] font-semibold text-[#6B6375] dark:text-[#a0aec0]">
								Mascot level
							</span>
						</span>
					</div>
				</CustomCard>
 
				<CustomCard variant="navyBorder" size="sm" className="flex-1 min-h-0 py-3">
					<div className="flex items-center gap-2">
						<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#FFD9E1] text-[#AC2A5D] dark:bg-[#3f1b2c] dark:text-[#ff6b9d]">
							<Coins className="size-4" aria-hidden="true" />
						</span>
						<span className="leading-tight">
							<span className="block text-sm font-extrabold text-[#091828] dark:text-white">
								{profile.coins.toLocaleString()}
							</span>
							<span className="block text-[10px] font-semibold text-[#6B6375] dark:text-[#a0aec0]">
								Coins
							</span>
						</span>
					</div>
				</CustomCard>
			</div>

            <CustomCard variant="navyBorder" size="md" className="relative overflow-hidden">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-24 rounded-t-[50%] bg-[#DCEFE8] dark:bg-[#1c263c]"
                />

                <div className="relative flex flex-col items-center">
                    <div
                        className="mb-3 max-w-[220px] rounded-2xl rounded-bl-sm border-2 border-[#091828] bg-white px-3 py-2 text-center text-sm font-bold text-[#091828] shadow-[3px_4px_0_#091828] dark:border-[#2d3449] dark:bg-[#1c263c] dark:text-white dark:shadow-[3px_4px_0_#060e20]"
                    >
                        {moodMeta.line}
                    </div>

                    <MascotAvatar
                        mood={mood}
                        size="lg"
                        equipped={equipped.map((item) => ({slot: item.slot, code: item.code}))}
                    />

                    <p className="mt-3 rounded-full bg-[#E8EFEC] px-3 py-1 text-xs font-bold text-[#091828] dark:bg-[#1c263c] dark:text-[#a0aec0]">
                        {moodMeta.label}
                    </p>

                    {equipped.length > 0 && (
                        <p className="mt-2 text-xs font-semibold text-[#6B6375] dark:text-[#a0aec0]">
                            Wearing {equipped.map((item) => item.code.replace(/_/g, " ")).join(" and ")}
                        </p>
                    )}

                    {moodReason && (
                        <p className="mt-2 max-w-[260px] text-center text-xs text-[#6B6375] dark:text-[#a0aec0]">
                            {moodReason}
                        </p>
                    )}
                </div>
            </CustomCard>


            <CustomCard variant="navyBorder" size="sm">
                <div className="flex items-baseline justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#6B6375] dark:text-[#a0aec0]">
                        Progress to level {level + 1}
                    </p>
                    <p className="text-xs font-bold text-[#091828] dark:text-white">
                        {progress.currentLevelXp} / {progress.xpForNextLevel} XP
                    </p>
                </div>
                <Progress
                    value={progress.percentToNextLevel}
                    tone="pink"
                    size="md"
                    className="mt-2"
                    aria-label={`Level progress, ${progress.percentToNextLevel} percent`}
                />
            </CustomCard>

            
            <div className="flex flex-col gap-2">
                <SectionHeader title="How I am doing" />
                
                <div className="grid grid-cols-3 gap-2">
                    <StatTile
                        tone="pink"
                        icon={<Flame className="size-4"/>}
                        value={loading ? "-" : String(profile?.paymentStreak ?? 0)}
                        label="Day streak"
                    />

                    <StatTile
                        tone="mint"
                        icon={<Sparkles className="size-4"/>}
                        value={loading ? "-" : String(profile?.knowledgeStreak ?? 0)}
                        label="Quiz streak"
                    />

                    <StatTile
                        tone="yellow"
                        icon={<Star className="size-4"/>}
                        value={loading ? "-" : String(profile?.badges.length ?? 0)}
                        label="Stickers"
                    />
                </div>
            </div>
            
            
            <MascotHubNav active="room"/>
            

            <LongButton LongVariant="primaryPinkBorder" LongSize="md" showArrow={false} asChild>
                <Link to="/mascot/shop">
                    <ShoppingBag className="mr-2 size-4" />
                    Open the shop
                </Link>
            </LongButton>

            <LongButton LongVariant="primaryDark" LongSize="md" showArrow={false} asChild>
                <Link to="/profile">Back to Profile</Link>
            </LongButton>
        </SubPageShell>
    )
}
