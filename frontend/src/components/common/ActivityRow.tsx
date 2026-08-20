import { cn } from "@/lib/utils"
import { FriendAvatar } from "@/components/common/FriendAvatar"

export type ActivityScope = "friends" | "following"

export type ActivityItem = {
	id: string
	friendId: string
	name: string
	avatarUrl?: string | null
	action: string
	detail: string
	reward: string
	rewardTone: "xp" | "coins" | "badge"
	timeAgo: string
	scope: ActivityScope
}

const rewardStyles ={
	xp:"bg-[#FFDF9A] text-[#201600] border-[#091828]",
	coins:"bg-[#DCEFE8] text-[#16635A] border-[#16635A]",
	badge:"bg-[#E8E4F4] text-[#5B4D8B] border-[#5B4D8B]",
}

export function ActivityRow({
	item,
	showName = true,
	className,
}: Readonly<{
	item: ActivityItem
	showName?: boolean
	className?: string
}>) {
	return (
		<div className={cn("flex items-center gap-3 py-2.5", className)}>
			<FriendAvatar displayName={item.name} avatarUrl={item.avatarUrl} size="sm" />
 
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-bold text-[#091828]">
					{showName ? `${item.name} ${item.action}` : item.action}
				</p>
				<p className="truncate text-xs text-[#6B6375]">{item.detail}</p>
			</div>
 
			<div className="flex shrink-0 flex-col items-end gap-1">
				<span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-bold",rewardStyles[item.rewardTone])}>
					{item.reward}
				</span>
				<span className="text-[10px] text-[#6B6375]">{item.timeAgo}</span>
			</div>
		</div>
	)
}