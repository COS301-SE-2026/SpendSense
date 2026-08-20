import { cn } from "@/lib/utils"
import type { WagerSummary } from "@/features/friends/friendsTypes"

//status chip for a wager. once a wager is COMPLETED we show *this caller's*
//own outcome rather than the raw status, since "Completed" tells them nothing
//about whether they won.

const outcomeStyles: Record<string, string> = {
	WON: "bg-[#DCEFE8] text-[#16635A] dark:bg-[#0f4f42] dark:text-[#5eead4]",
	LOST: "bg-[#FCE0E8] text-[#AC2A5D] dark:bg-[#2d1b2e] dark:text-[#ff6b9d]",
	DRAW: "bg-[#E3EAE6] text-[#3E4A55] dark:bg-[#1c263c] dark:text-[#dae2fd]",
}

const statusStyles: Record<string, string> = {
	PENDING: "bg-[#FFE9B5] text-[#7A5A00] dark:bg-[#3f2e00] dark:text-[#ffd166]",
	ACTIVE: "bg-[#DCE8F7] text-[#1E4FAE] dark:bg-[#1e293b] dark:text-[#dae2fd]",
	DECLINED: "bg-[#E3EAE6] text-[#3E4A55] dark:bg-[#1c263c] dark:text-[#dae2fd]",
	CANCELLED: "bg-[#E3EAE6] text-[#3E4A55] dark:bg-[#1c263c] dark:text-[#dae2fd]",
	EXPIRED: "bg-[#E3EAE6] text-[#3E4A55] dark:bg-[#1c263c] dark:text-[#dae2fd]",
}

const statusLabels: Record<string, string> = {
	PENDING: "Pending",
	ACTIVE: "Active",
	DECLINED: "Declined",
	CANCELLED: "Cancelled",
	EXPIRED: "Expired",
}

const outcomeLabels: Record<string, string> = {
	WON: "Won",
	LOST: "Lost",
	DRAW: "Draw",
}

export function WagerStatusPill({ wager }: Readonly<{ wager: WagerSummary }>) {
	if (wager.status === "COMPLETED") {
		const outcome = (wager.isCreator ? wager.creatorOutcome : wager.opponentOutcome) ?? "DRAW"
		return (
			<span
				className={cn(
					"shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
					outcomeStyles[outcome],
				)}
			>
				{outcomeLabels[outcome]}
			</span>
		)
	}

	return (
		<span
			className={cn(
				"shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
				statusStyles[wager.status],
			)}
		>
			{statusLabels[wager.status]}
		</span>
	)
}