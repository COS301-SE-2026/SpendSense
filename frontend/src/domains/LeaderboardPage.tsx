import * as React from "react"
import { Link } from "react-router-dom"
import { Coins, Flame, Medal, Swords, Trophy } from "lucide-react"
 
import { CustomCard } from "@/components/ui/CustomCard"
import { LongButton } from "@/components/common/LongButton"
import { FriendsPageShell } from "@/components/common/FriendsPageShell"
import { FilterChips } from "@/components/common/FilterChips"
import { FriendAvatar, type AvatarTone } from "@/components/common/FriendAvatar"
import { cn } from "@/lib/utils"
 

type LeaderboardScope = "global" | "friends"

type LeaderboardEntry = {
    rank: number
    friendId: string
    name: string
    initials: string
    tone: AvatarTone
    coins: number
    isCurrentUser: boolean
}

//TODO: replace both lists with the real leaderboard endpoint.
const mockGlobalLeaderboard: LeaderboardEntry[] = [
	{ rank: 1, friendId: "alex-r", name: "Alex R.", initials: "AR", tone: "mint", coins: 1250, isCurrentUser: false },
	{ rank: 2, friendId: "jordan-l", name: "Jordan L.", initials: "JL", tone: "blue", coins: 980, isCurrentUser: false },
	{ rank: 3, friendId: "sam-k", name: "Sam K.", initials: "SK", tone: "yellow", coins: 870, isCurrentUser: false },
	{ rank: 4, friendId: "taylor-l", name: "Taylor L.", initials: "TL", tone: "pink", coins: 705, isCurrentUser: false },
	{ rank: 5, friendId: "casey-p", name: "Casey P.", initials: "CP", tone: "hotpink", coins: 610, isCurrentUser: false },
	{ rank: 6, friendId: "morgan-b", name: "Morgan B.", initials: "MB", tone: "slate", coins: 560, isCurrentUser: false },
	{ rank: 7, friendId: "me", name: "You", initials: "RC", tone: "hotpink", coins: 640, isCurrentUser: true },
	{ rank: 8, friendId: "riley-t", name: "Riley T.", initials: "RT", tone: "maroon", coins: 540, isCurrentUser: false },
]

const mockFriendsLeaderboard: LeaderboardEntry[] = [
	{ rank: 1, friendId: "alex-r", name: "Alex R.", initials: "AR", tone: "mint", coins: 1250, isCurrentUser: false },
	{ rank: 2, friendId: "jordan-l", name: "Jordan L.", initials: "JL", tone: "blue", coins: 980, isCurrentUser: false },
	{ rank: 3, friendId: "sam-k", name: "Sam K.", initials: "SK", tone: "yellow", coins: 870, isCurrentUser: false },
	{ rank: 4, friendId: "taylor-l", name: "Taylor L.", initials: "TL", tone: "pink", coins: 705, isCurrentUser: false },
	{ rank: 5, friendId: "me", name: "You", initials: "RC", tone: "hotpink", coins: 640, isCurrentUser: true },
	{ rank: 6, friendId: "casey-p", name: "Casey P.", initials: "CP", tone: "hotpink", coins: 610, isCurrentUser: false },
]

export default function LeaderboardPage(){
    const [scope, setScope] = React.useState<LeaderboardScope>("friends")
    const entries = scope === "global" ? mockGlobalLeaderboard : mockFriendsLeaderboard
    const podium = entries.slice(0, 3)
    const rest = entries.slice(3)

    const podiumStyles=[
        { bg: "bg-[#FFE9B5]", icon: "text-[#7A5A00]", height: "pt-6" },
		{ bg: "bg-[#E3EAE6]", icon: "text-[#3E4A55]", height: "pt-9" },
		{ bg: "bg-[#FCE0E8]", icon: "text-[#AC2A5D]", height: "pt-9" },
    ]

    return (
        <FriendsPageShell title="Leaderboard" subtitle="Global and friends rankings">
			<FilterChips
				active={scope}
				onChange={setScope}
				options={[
					{ key: "friends", label: "Friends" },
					{ key: "global", label: "Global" },
				]}
			/>
 
			<CustomCard variant="navyBorder" size="sm" className="bg-[#E8E4F4]">
				<div className="flex items-center gap-3">
					<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white">
						<Trophy className="size-5 text-[#5B4D8B]" />
					</div>
 
					<div className="min-w-0 flex-1">
						<p className="text-sm font-bold text-[#5B4D8B]">
							{scope === "global" ? "Global Leaderboard" : "Friends Leaderboard"}
						</p>
						<p className="text-xs text-[#6B6375]">Top savers this month</p>
					</div>
				</div>
 
				<div className="mt-4 grid grid-cols-3 items-end gap-2">
					{podium.map((entry, index) => (
						<div
							key={entry.friendId}
							className={cn(
								"flex flex-col items-center gap-1 rounded-xl border-2 border-[#091828] px-2 pb-3",
								podiumStyles[index].bg,
								podiumStyles[index].height
							)}
						>
							<Medal className={cn("size-5", podiumStyles[index].icon)} />
							<span className="text-sm font-extrabold text-[#091828]">
								{entry.rank}
							</span>
							<FriendAvatar
								initials={entry.initials}
								tone={entry.tone}
								size="sm"
							/>
							<span className="truncate text-[11px] font-bold text-[#091828]">
								{entry.name}
							</span>
							<span className="text-[11px] text-[#6B6375]">{entry.coins}</span>
						</div>
					))}
				</div>
			</CustomCard>
 
			<CustomCard variant="navyBorder" size="sm">
				<div className="divide-y divide-[#E8EFEC]">
					{rest.map((entry) => (
						<div
							key={entry.friendId}
							className={cn(
								"flex items-center gap-3 py-2.5",
								entry.isCurrentUser && "rounded-lg bg-[#FFF1F4] px-2"
							)}
						>
							<span className="w-5 shrink-0 text-sm font-extrabold text-[#6B6375]">
								{entry.rank}
							</span>
 
							<FriendAvatar
								initials={entry.initials}
								tone={entry.tone}
								size="sm"
							/>
 
							<p
								className={cn(
									"min-w-0 flex-1 truncate text-sm font-bold",
									entry.isCurrentUser ? "text-[#AC2A5D]" : "text-[#091828]"
								)}
							>
								{entry.name}
							</p>
 
							<span className="flex shrink-0 items-center gap-1 text-sm font-bold text-[#091828]">
								<Coins className="size-4 text-[#F2BF3C]" />
								{entry.coins}
							</span>
						</div>
					))}
				</div>
			</CustomCard>
 
			<CustomCard variant="navyBorder" size="sm" className="flex items-center gap-3">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FFE9B5] text-[#7A5A00]">
					<Flame className="size-5" />
				</div>
 
				<div className="min-w-0 flex-1">
					<p className="text-sm font-bold text-[#091828]">Climb the ranks</p>
					<p className="text-xs text-[#6B6375]">
						Win duels to earn coins and move up.
					</p>
				</div>
			</CustomCard>
 
			<LongButton LongVariant="primaryDark" LongSize="md" showArrow={false} asChild>
				<Link to="/quests">
					<Swords className="mr-2 size-4" />
					Start Challenges
				</Link>
			</LongButton>
		</FriendsPageShell>
    )
}