import { Flame } from "lucide-react"

import { FriendAvatar } from "@/components/common/FriendAvatar"
import { cn } from "@/lib/utils"
import type { LeaderboardEntry } from "@/features/friends/friendsTypes"

//one row of the friends leaderboard. used by the hub preview and the full
//leaderboard page. 

export function LeaderboardRow({
	entry,
	showStreakIcon = false,
}: Readonly<{
	entry: LeaderboardEntry
	//the value is a streak count rather than a tier rank, so show the flame
	showStreakIcon?: boolean
}>) {
	return (
		<div
			className={cn(
				"flex items-center gap-3 py-2.5",
				entry.isSelf && "rounded-lg bg-[#FFF1F4] px-2 dark:bg-[#2d1b2e]",
			)}
		>
			<span className="w-5 shrink-0 text-sm font-extrabold text-[#6B6375] dark:text-[#a0aec0]">
				{entry.rank}
			</span>

			<FriendAvatar
				displayName={entry.displayName}
				avatarUrl={entry.avatarUrl}
				size="sm"
			/>

			<p
				className={cn(
					"min-w-0 flex-1 truncate text-sm font-bold",
					entry.isSelf
						? "text-[#AC2A5D] dark:text-[#ff6b9d]"
						: "text-[#091828] dark:text-white",
				)}
			>
				{entry.isSelf ? "You" : entry.displayName}
			</p>

			<span className="flex shrink-0 items-center gap-1 text-sm font-bold text-[#091828] dark:text-white">
				{showStreakIcon && <Flame className="size-4 text-[#FF6B9D]" />}
				{entry.value}
			</span>
		</div>
	)
}