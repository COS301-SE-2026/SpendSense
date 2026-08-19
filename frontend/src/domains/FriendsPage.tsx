import * as React from "react"
import { Link } from "react-router-dom"
import {
	UserPlus,
	Trophy,
	Swords,
	Activity,
	Search,
	Medal,
	Coins,
	Check,
	X,
} from "lucide-react"

import { CustomCard } from "@/components/ui/CustomCard"
import { LongButton } from "@/components/common/LongButton"
import { FriendAvatar, type AvatarTone } from "@/components/common/FriendAvatar"
import { ActivityRow, type ActivityItem } from "@/components/common/ActivityRow"
import { cn } from "@/lib/utils"
import { BottomNav } from "@/components/common/BottomNav"

type HubTab = "feed" | "friends" | "leaderboard"

//everything below is mock data for the hub.
//TO DO: replace each of these with the matching backend call. the shapes are
//what the cards already expect, so only these consts should need to change.

type HubFriend = {
	id: string
	name: string
	initials: string
	tone: AvatarTone
	online: boolean
}

type FriendRequest = {
	id: string
	name: string
	initials: string
	tone: AvatarTone
	mutualFriends: number
}

type LeaderboardEntry = {
	rank: number
	friendId: string
	name: string
	initials: string
	tone: AvatarTone
	coins: number
	isCurrentUser: boolean
}

type Duel = {
	id: string
	opponentId: string
	opponentName: string
	initials: string
	tone: AvatarTone
	title: string
	tagline: string
	prizeCoins: number
	daysLeft: number
}

const totalFriends = 23
const onlineFriends = 12

const mockPreviewFriends: HubFriend[] = [
	{ id: "alex-r", name: "Alex R.", initials: "AR", tone: "mint", online: true },
	{ id: "sam-k", name: "Sam K.", initials: "SK", tone: "yellow", online: true },
	{ id: "jordan-l", name: "Jordan L.", initials: "JL", tone: "blue", online: false },
	{ id: "taylor-l", name: "Taylor L.", initials: "TL", tone: "pink", online: false },
]

const mockFriendRequests: FriendRequest[] = [
	{ id: "req-jamie", name: "Jamie D.", initials: "JD", tone: "blue", mutualFriends: 5 },
	{ id: "req-morgan", name: "Morgan B.", initials: "MB", tone: "slate", mutualFriends: 3 },
]

const mockLeaderboard: LeaderboardEntry[] = [
	{ rank: 1, friendId: "alex-r", name: "Alex R.", initials: "AR", tone: "mint", coins: 1250, isCurrentUser: false },
	{ rank: 2, friendId: "jordan-l", name: "Jordan L.", initials: "JL", tone: "blue", coins: 980, isCurrentUser: false },
	{ rank: 3, friendId: "sam-k", name: "Sam K.", initials: "SK", tone: "yellow", coins: 870, isCurrentUser: false },
	{ rank: 4, friendId: "taylor-l", name: "Taylor L.", initials: "TL", tone: "pink", coins: 705, isCurrentUser: false },
	{ rank: 5, friendId: "me", name: "You", initials: "RC", tone: "hotpink", coins: 640, isCurrentUser: true },
]

const mockFeaturedDuel: Duel = {
	id: "duel-1",
	opponentId: "sam-k",
	opponentName: "Sam K.",
	initials: "SK",
	tone: "yellow",
	title: "Challenge Sam",
	tagline: "Spend less, save more!",
	prizeCoins: 200,
	daysLeft: 7,
}

const mockActivityFeed: ActivityItem[] = [
	{ id: "act-1", friendId: "alex-r", name: "Alex", initials: "AR", tone: "mint", action: "completed a quest", detail: "Log an Expense", reward: "+10 XP", rewardTone: "xp", timeAgo: "2m ago", scope: "friends" },
	{ id: "act-2", friendId: "jordan-l", name: "Jordan", initials: "JL", tone: "blue", action: "paid on time", detail: "Electricity Bill", reward: "+50 coins", rewardTone: "coins", timeAgo: "1h ago", scope: "friends" },
	{ id: "act-3", friendId: "sam-k", name: "Sam", initials: "SK", tone: "yellow", action: "unlocked a badge", detail: "Budget Boss", reward: "+1 badge", rewardTone: "badge", timeAgo: "3h ago", scope: "friends" },
	{ id: "act-4", friendId: "taylor-l", name: "Taylor", initials: "TL", tone: "pink", action: "completed a challenge", detail: "No Late Payments", reward: "+25 coins", rewardTone: "coins", timeAgo: "5h ago", scope: "friends" },
	{ id: "act-5", friendId: "casey-p", name: "Casey", initials: "CP", tone: "hotpink", action: "started a challenge", detail: "Save 100", reward: "+0 XP", rewardTone: "xp", timeAgo: "6h ago", scope: "following" },
	{ id: "act-6", friendId: "morgan-b", name: "Morgan", initials: "MB", tone: "slate", action: "hit a 7 day streak", detail: "Knowledge Streak", reward: "+15 XP", rewardTone: "xp", timeAgo: "8h ago", scope: "following" },
]

export default function FriendsPage() {
	const [tab, setTab] = React.useState<HubTab>("friends")

	//requests are local state for now so accept / ignore actually does something.
	//TO DO: swap for a POST to the backend once the endpoint exists.
	const [requests, setRequests] = React.useState<FriendRequest[]>(mockFriendRequests)

	const respondToRequest = (id: string) => {
		setRequests((current) => current.filter((r) => r.id !== id))
	}

	const previewFriends = mockPreviewFriends
	const remainingFriends = totalFriends - previewFriends.length
	const podium = mockLeaderboard.slice(0, 3)
	const featuredDuel = mockFeaturedDuel

	return (
		<div className="min-h-screen bg-[#F4FBF7] pb-24">
			<div className="mx-auto w-full max-w-md px-5 pt-6">
				<header className="flex items-center gap-3">
					<Link
						to="/friends/list"
						aria-label="Search friends"
						className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#E3EAE6] shadow-[4px_4px_0_#091828]"
					>
						<Search className="size-5 text-[#091828]" />
					</Link>

					<div className="flex flex-1 items-center justify-center">
						<div
							className="rounded-full border-2 border-[#091828] bg-white px-6 py-2.5 shadow-[4px_4px_0_#091828]"
							style={{ transform: "rotate(-3deg)" }}
						>
							<h1 className="text-base font-bold text-[#091828]">Friends Hub</h1>
						</div>
					</div>

					<Link
						to="/friends/add"
						aria-label="Add friend"
						className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FF6B9D] shadow-[4px_4px_0_#091828]"
					>
						<UserPlus className="size-5 text-[#6E0034]" />
					</Link>
				</header>

				<p className="mt-4 text-center text-sm text-[#6B6375]">
					Connect, compete and celebrate together.
				</p>

				<HubTabs active={tab} onChange={setTab} />

				<div className="mt-6 flex flex-col gap-4">
					{tab === "friends" && (
						<>
							<FriendsPreviewCard
								previewFriends={previewFriends}
								remaining={remainingFriends}
							/>

							{requests.length > 0 && (
								<FriendRequestsCard
									requests={requests}
									onRespond={respondToRequest}
								/>
							)}

							<LeaderboardPreviewCard podium={podium} />

							<DuelCard duel={featuredDuel} />

							<ActivityPreviewCard />
						</>
					)}

					{tab === "feed" && (
						<>
							<ActivityPreviewCard limit={6} />

							<LongButton LongVariant="outline" LongSize="md" showArrow={false} asChild>
								<Link to="/friends/activity">View all activity</Link>
							</LongButton>
						</>
					)}

					{tab === "leaderboard" && (
						<>
							<LeaderboardPreviewCard podium={podium} />

							<CustomCard variant="navyBorder" size="sm">
								<SectionHead
									title="Friends ranking"
									to="/friends/leaderboard"
								/>

								<div className="mt-2 divide-y divide-[#E8EFEC]">
									{mockLeaderboard.slice(0, 5).map((entry) => (
										<div
											key={entry.friendId}
											className="flex items-center gap-3 py-2.5"
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
													entry.isCurrentUser
														? "text-[#AC2A5D]"
														: "text-[#091828]"
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

							<DuelCard duel={featuredDuel} />
						</>
					)}

					<QuickLinksCard />
				</div>
			</div>

			<BottomNav active="home" />
		</div>
	)
}

function HubTabs({
	active,
	onChange,
}: Readonly<{
	active: HubTab
	onChange: (tab: HubTab) => void
}>) {
	const tabs: { key: HubTab; label: string }[] = [
		{ key: "feed", label: "Feed" },
		{ key: "friends", label: "Friends" },
		{ key: "leaderboard", label: "Leaderboard" },
	]

	return (
		<div className="mt-5 flex items-center gap-2 rounded-full border-2 border-[#091828] bg-[#E3EAE6] p-1">
			{tabs.map((t) => (
				<button
					key={t.key}
					type="button"
					onClick={() => onChange(t.key)}
					className={cn(
						"flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition",
						active === t.key
							? "bg-[#FF6B9D] text-[#6E0034]"
							: "text-[#6B6375] hover:text-[#091828]"
					)}
					aria-pressed={active === t.key}
				>
					{t.label}
				</button>
			))}
		</div>
	)
}

//small heading with a "View all" link, used inside each hub card

function SectionHead({
	title,
	meta,
	to,
}: Readonly<{
	title: string
	meta?: string
	to: string
}>) {
	return (
		<div className="flex items-baseline justify-between gap-3">
			<h2 className="text-base font-extrabold text-[#091828]">
				{title}
				{meta && <span className="ml-1 text-sm font-bold text-[#6B6375]">{meta}</span>}
			</h2>

			<Link to={to} className="text-xs font-bold text-[#AC2A5D] underline">
				View all
			</Link>
		</div>
	)
}

function FriendsPreviewCard({
	previewFriends,
	remaining,
}: Readonly<{
	previewFriends: HubFriend[]
	remaining: number
}>) {
	return (
		<CustomCard variant="navyBorder" size="sm">
			<SectionHead title="Friends" meta={`(${totalFriends})`} to="/friends/list" />

			<div className="mt-4 flex items-start justify-between gap-2">
				{previewFriends.map((friend) => (
					<Link
						key={friend.id}
						to={`/friends/${friend.id}`}
						className="flex w-14 flex-col items-center gap-1.5"
					>
						<FriendAvatar
							initials={friend.initials}
							tone={friend.tone}
							size="lg"
							online={friend.online}
						/>
						<span className="truncate text-[11px] font-semibold text-[#091828]">
							{friend.name}
						</span>
					</Link>
				))}

				{remaining > 0 && (
					<Link
						to="/friends/list"
						className="flex w-14 flex-col items-center gap-1.5"
					>
						<div className="flex size-14 items-center justify-center rounded-full border-2 border-dashed border-[#A8B4AE] text-sm font-bold text-[#6B6375]">
							+{remaining}
						</div>
						<span className="text-[11px] font-semibold text-[#6B6375]">More</span>
					</Link>
				)}
			</div>

			<p className="mt-4 text-xs text-[#6B6375]">
				{onlineFriends} friends online right now.
			</p>
		</CustomCard>
	)
}

function FriendRequestsCard({
	requests,
	onRespond,
}: Readonly<{
	requests: FriendRequest[]
	onRespond: (id: string) => void
}>) {
	return (
		<CustomCard variant="navyBorder" size="sm">
			<SectionHead
				title="Friend Requests"
				meta={`(${requests.length})`}
				to="/friends/add"
			/>

			<div className="mt-2 divide-y divide-[#E8EFEC]">
				{requests.map((request) => (
					<div key={request.id} className="flex items-center gap-3 py-3">
						<FriendAvatar
							initials={request.initials}
							tone={request.tone}
							size="md"
						/>

						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-bold text-[#091828]">
								{request.name}
							</p>
							<p className="truncate text-xs text-[#6B6375]">
								{request.mutualFriends} mutual friends
							</p>
						</div>

						<button
							type="button"
							onClick={() => onRespond(request.id)}
							className="flex shrink-0 items-center gap-1 rounded-full border-2 border-[#091828] bg-[#FF6B9D] px-3 py-1.5 text-xs font-bold text-[#6E0034] shadow-[2px_3px_0_#091828] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
						>
							<Check className="size-3.5" />
							Accept
						</button>

						<button
							type="button"
							onClick={() => onRespond(request.id)}
							aria-label={`Ignore request from ${request.name}`}
							className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-white text-[#6B6375] transition active:translate-x-[2px] active:translate-y-[2px]"
						>
							<X className="size-3.5" />
						</button>
					</div>
				))}
			</div>
		</CustomCard>
	)
}

function LeaderboardPreviewCard({
	podium,
}: Readonly<{
	podium: LeaderboardEntry[]
}>) {
	const podiumStyles = [
		{ bg: "bg-[#FFE9B5]", icon: "text-[#7A5A00]" },
		{ bg: "bg-[#E3EAE6]", icon: "text-[#3E4A55]" },
		{ bg: "bg-[#FCE0E8]", icon: "text-[#AC2A5D]" },
	]

	return (
		<CustomCard variant="navyBorder" size="sm">
			<SectionHead title="Leaderboards" to="/friends/leaderboard" />

			<div className="mt-3 rounded-xl border-2 border-[#091828] bg-[#E8E4F4] px-4 py-3">
				<div className="flex items-center gap-3">
					<div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white">
						<Trophy className="size-5 text-[#5B4D8B]" />
					</div>
					<div className="min-w-0">
						<p className="text-sm font-bold text-[#5B4D8B]">Global Leaderboard</p>
						<p className="text-xs text-[#6B6375]">Top savers this month</p>
					</div>
				</div>
			</div>

			<div className="mt-3 grid grid-cols-3 gap-2">
				{podium.map((entry, index) => (
					<Link
						key={entry.friendId}
						to="/friends/leaderboard"
						className={cn(
							"flex flex-col items-center gap-1 rounded-xl border-2 border-[#091828] px-2 py-3",
							podiumStyles[index].bg
						)}
					>
						<Medal className={cn("size-5", podiumStyles[index].icon)} />
						<span className="text-xs font-extrabold text-[#091828]">
							{entry.rank}
						</span>
						<span className="truncate text-[11px] font-bold text-[#091828]">
							{entry.name}
						</span>
						<span className="text-[11px] text-[#6B6375]">{entry.coins}</span>
					</Link>
				))}
			</div>
		</CustomCard>
	)
}

function DuelCard({ duel }: Readonly<{ duel: Duel }>) {
	return (
		<CustomCard variant="navyBorder" size="sm">
			<SectionHead title="Challenges / Duels" to="/quests" />

			<div className="mt-3 rounded-xl border-2 border-[#091828] bg-[#FFE9B5] px-4 py-3">
				<div className="flex items-start gap-3">
					<FriendAvatar initials={duel.initials} tone={duel.tone} size="md" />

					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-bold text-[#7A5A00]">
							{duel.title}
						</p>
						<p className="truncate text-xs text-[#6B6375]">{duel.tagline}</p>
					</div>

					<span className="shrink-0 text-[11px] font-semibold text-[#6B6375]">
						{duel.daysLeft} days left
					</span>
				</div>

				<div className="mt-3 flex items-center gap-3">
					<span className="flex items-center gap-1 text-sm font-bold text-[#091828]">
						<Coins className="size-4 text-[#F2BF3C]" />
						Win {duel.prizeCoins} coins
					</span>

					<LongButton
						LongVariant="primaryDark"
						LongSize="sm"
						showArrow={false}
						fullWidth={false}
						className="ml-auto"
						asChild
					>
						<Link to="/quests">
							<Swords className="mr-1 size-4" />
							Start Challenge
						</Link>
					</LongButton>
				</div>
			</div>
		</CustomCard>
	)
}

function ActivityPreviewCard({ limit = 3 }: Readonly<{ limit?: number }>) {
	return (
		<CustomCard variant="navyBorder" size="sm">
			<SectionHead title="Activity Feed" to="/friends/activity" />

			<div className="mt-2 divide-y divide-[#E8EFEC]">
				{mockActivityFeed.slice(0, limit).map((item) => (
					<ActivityRow key={item.id} item={item} />
				))}
			</div>
		</CustomCard>
	)
}


function QuickLinksCard() {
	const links = [
		{
			to: "/friends/leaderboard",
			icon: <Trophy className="size-4" />,
			title: "View leaderboard",
			description: "See global and friends rankings",
			tone: "bg-[#FFE9B5] text-[#7A5A00]",
		},
		{
			to: "/friends/add",
			icon: <UserPlus className="size-4" />,
			title: "Open friend requests",
			description: "Accept or ignore requests",
			tone: "bg-[#FCE0E8] text-[#AC2A5D]",
		},
		{
			to: "/quests",
			icon: <Swords className="size-4" />,
			title: "Start a challenge",
			description: "Compete and earn rewards",
			tone: "bg-[#DCEFE8] text-[#16635A]",
		},
		{
			to: "/friends/activity",
			icon: <Activity className="size-4" />,
			title: "View friends activity",
			description: "See active duels and results",
			tone: "bg-[#E8E4F4] text-[#5B4D8B]",
		},
		
	]

	return (
		<CustomCard variant="navyBorder" size="sm" className="border-dashed">
			<h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#AC2A5D]">
				From the hub you can also
			</h2>

			<div className="mt-3 flex flex-col gap-3">
				{links.map((link) => (
					<Link key={link.title} to={link.to} className="flex items-center gap-3">
						<div
							className={cn(
								"flex size-8 shrink-0 items-center justify-center rounded-full",
								link.tone
							)}
						>
							{link.icon}
						</div>

						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-bold text-[#091828]">
								{link.title}
							</p>
							<p className="truncate text-xs text-[#6B6375]">
								{link.description}
							</p>
						</div>
					</Link>
				))}
			</div>
		</CustomCard>
	)
}