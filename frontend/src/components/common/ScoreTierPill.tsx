import { cn } from "@/lib/utils"
import { SCORE_TIER_LABELS, type ScoreTier } from "@/features/friends/friendsTypes"

//the contract exposes a friend's credit standing as a tier, never a raw number


const tierStyles: Record<ScoreTier, string> = {
	BUILDING: "bg-[#E3EAE6] text-[#3E4A55] dark:bg-[#1c263c] dark:text-[#dae2fd]",
	FAIR: "bg-[#FFE7AE] text-[#7A4A00] dark:bg-[#3f2e00] dark:text-[#ffd166]",
	GOOD: "bg-[#DCEFE8] text-[#16635A] dark:bg-[#0f4f42] dark:text-[#5eead4]",
	EXCELLENT: "bg-[#DCE8F7] text-[#1E4FAE] dark:bg-[#1e293b] dark:text-[#dae2fd]",
	ELITE: "bg-[#E0B0FF] text-[#6E0034] dark:bg-[#2d1b2e] dark:text-[#ff6b9d]",
}

export function ScoreTierPill({
	tier,
	className,
}: Readonly<{
	tier: ScoreTier
	className?: string
}>) {
	return (
		<span
			className={cn(
				"shrink-0 rounded-full border border-[#091828] px-2.5 py-0.5 text-[11px] font-bold dark:border-[#2d3449]",
				tierStyles[tier],
				className,
			)}
		>
			{SCORE_TIER_LABELS[tier]}
		</span>
	)
}