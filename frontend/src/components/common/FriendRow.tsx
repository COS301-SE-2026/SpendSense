import { Link } from "react-router-dom"
import { Flame, Award } from "lucide-react"

import { FriendAvatar } from "@/components/common/FriendAvatar"
import { ScoreTierPill } from "@/components/common/ScoreTierPill"
import type { FriendSummary } from "@/features/friends/friendsTypes"

//a single friend in a list. only shows the public fields the contract returns:
//display name, score tier, payment streak and badge count. never obligations,
//payments or email.

export function FriendRow({ friend }: Readonly<{ friend: FriendSummary }>) {
	return (
		<Link
			to={`/friends/${friend.friendId}`}
			className="flex items-center gap-3 rounded-xl px-1 py-2.5 transition hover:bg-[#F4FBF7] dark:hover:bg-[#1c263c]"
		>
			<FriendAvatar
				displayName={friend.displayName}
				avatarUrl={friend.avatarUrl}
				size="md"
			/>

			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-bold text-[#091828] dark:text-white">
					{friend.displayName}
				</p>
				<div className="mt-0.5 flex items-center gap-2 text-xs text-[#6B6375] dark:text-[#a0aec0]">
					<span className="flex items-center gap-1">
						<Flame
							className={
								friend.currentPaymentStreak > 0
									? "size-3.5 text-[#FF6B9D]"
									: "size-3.5 text-[#C4C6CC] dark:text-[#a0aec0]/50"
							}
						/>
						{friend.currentPaymentStreak}
					</span>
					<span className="flex items-center gap-1">
						<Award className="size-3.5 text-[#5B4D8B] dark:text-[#ff6b9d]" />
						{friend.badgeCount}
					</span>
				</div>
			</div>

			<ScoreTierPill tier={friend.scoreTier} />
		</Link>
	)
}