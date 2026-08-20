import * as React from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
	Users,
	UserPlus,
	Trophy,
	Swords,
	ArrowLeft,
	Medal,
	Check,
	X,
	Coins,
	Lock,
} from "lucide-react"

import { CustomCard } from "@/components/ui/CustomCard"
import { LongButton } from "@/components/common/LongButton"
import { BottomNav } from "@/components/common/BottomNav"
import { FriendAvatar } from "@/components/common/FriendAvatar"
import { EmptyCard, ErrorCard, LoadingCard } from "@/components/common/AsyncStates"
import { cn } from "@/lib/utils"
import { useFriendRequests, useFriends, useFriendsLeaderboard } from "@/hooks/useFriends"
import { useWagers } from "@/hooks/useWagers"
import {
	acceptFriendRequest,
	declineFriendRequest,
} from "@/features/friends/friendsApi"
import {
	WAGER_TASK_LABELS,
	type FriendRequestSummary,
	type FriendSummary,
	type LeaderboardEntry,
	type WagerSummary,
} from "@/features/friends/friendsTypes"

//UC-A Friends Hub. tabs are Friends | Leaderboard | Wagers per use case -
//the old "Feed" tab is gone, the activity feed stays reachable at
///friends/activity but is out of scope for the committed tier

type HubTab = "friends" | "leaderboard" | "wagers"

//friends hub is reachable from the dashboard and from the profile menu; the
//linking page tags its Link with state so we know where "back" should go and
//which bottom nav tab to keep highlighted while we're here
type FriendsOrigin = "dashboard" | "profile"

function resolveOrigin(state: unknown): FriendsOrigin {
	if (state && typeof state === "object" && (state as { from?: unknown }).from === "profile") {
		return "profile"
	}
	return "dashboard"
}

export default function FriendsPage() {
	const [tab, setTab] = React.useState<HubTab>("friends")
	const location = useLocation()
	const navigate = useNavigate()
	const origin = resolveOrigin(location.state)
	const backTo = origin === "profile" ? "/profile" : "/domains/dashboard"

	const { friends, isLoading: friendsLoading, error: friendsError, reload: reloadFriends } =
		useFriends()

	return (
		<div className="min-h-screen bg-[#F4FBF7] pb-24 dark:bg-[#0b1326]">
			<div className="mx-auto w-full max-w-md px-5 pt-6">
				<header className="flex items-center gap-3">
					<button
						type="button"
						aria-label="Back"
						onClick={() => navigate(backTo)}
						className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#ff6b9d] shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#2d3449] dark:shadow-[4px_4px_0_#060e20]"
					>
						<ArrowLeft className="size-5 text-[#091828] dark:text-[#dae2fd]" />
					</button>

					<div className="flex flex-1 items-center justify-center">
						<div
							className="rounded-full border-2 border-[#091828] bg-white px-6 py-2.5 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#ffb1c5] dark:shadow-[4px_4px_0_#ff6b9d]"
							style={{ transform: "rotate(-3deg)" }}
						>
							<h1 className="text-base font-bold text-[#091828] dark:text-[#091828]">
								Friends Hub
							</h1>
						</div>
					</div>

					<Link
						to="/friends/add"
						aria-label="Add friend"
						className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FF6B9D] shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#ffb1c5] dark:shadow-[4px_4px_0_#060e20]"
					>
						<UserPlus className="size-5 text-[#6E0034] dark:text-[#650030]" />
					</Link>
				</header>

				<p className="mt-4 text-center text-sm text-[#6B6375] dark:text-[#ddbfc5]">
					Connect, compete and celebrate together.
				</p>

				<HubTabs active={tab} onChange={setTab} />

				<div className="mt-6 flex flex-col gap-4">
					{tab === "friends" && (
						<FriendsTab
							friends={friends}
							isLoading={friendsLoading}
							error={friendsError}
							onRetry={reloadFriends}
						/>
					)}

					{tab === "leaderboard" && <LeaderboardTab />}

					{tab === "wagers" && <WagersTab />}

					<QuickLinksCard />
				</div>
			</div>

			<BottomNav active={origin === "profile" ? "profile" : "home"} />
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
		{ key: "friends", label: "Friends" },
		{ key: "leaderboard", label: "Leaderboard" },
		{ key: "wagers", label: "Wagers" },
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
							: "text-[#6B6375] hover:text-[#091828] dark:text-[#a0aec0] dark:hover:text-[#dae2fd]",
					)}
					aria-pressed={active === t.key}
				>
					{t.label}
				</button>
			))}
		</div>
	)
}

function SectionHead({
	title,
	meta,
	to,
	linkLabel = "View all",
}: Readonly<{
	title: string
	meta?: string
	to: string
	linkLabel?: string
}>) {
	return (
		<div className="flex items-baseline justify-between gap-3">
			<h2 className="text-base font-extrabold text-[#091828] dark:text-white">
				{title}
				{meta && (
					<span className="ml-1 text-sm font-bold text-[#6B6375] dark:text-[#a0aec0]">
						{meta}
					</span>
				)}
			</h2>

			<Link
				to={to}
				className="text-xs font-bold text-[#AC2A5D] underline dark:text-[#ff6b9d]"
			>
				{linkLabel}
			</Link>
		</div>
	)
}



function FriendsTab({
	friends,
	isLoading,
	error,
	onRetry,
}: Readonly<{
	friends: FriendSummary[] | null
	isLoading: boolean
	error: string | null
	onRetry: () => void
}>) {
	if (isLoading) {
		return <LoadingCard label="Loading your friends" />
	}

	if (error) {
		return <ErrorCard message={error} onRetry={onRetry} />
	}

	const list = friends ?? []

	return (
		<>
			{list.length === 0 ? (
				<EmptyCard
					icon={<Users className="size-5" />}
					title="No friends yet"
					description="Search for someone you know and send them a friend request to get started."
					action={
						<LongButton
							LongVariant="primaryPinkBorder"
							LongSize="sm"
							showArrow={false}
							fullWidth={false}
							asChild
						>
							<Link to="/friends/add">Find friends</Link>
						</LongButton>
					}
				/>
			) : (
				<CustomCard variant="navyBorder" size="sm">
					<SectionHead title="Friends" meta={`(${list.length})`} to="/friends/list" />

					<div className="mt-4 flex items-start gap-3 overflow-x-auto pb-1">
						{list.slice(0, 4).map((friend) => (
							<Link
								key={friend.friendId}
								to={`/friends/${friend.friendId}`}
								className="flex w-14 shrink-0 flex-col items-center gap-1.5"
							>
								<FriendAvatar
									displayName={friend.displayName}
									avatarUrl={friend.avatarUrl}
									size="lg"
								/>
								<span className="w-full truncate text-center text-[11px] font-semibold text-[#091828] dark:text-white">
									{friend.displayName}
								</span>
							</Link>
						))}

						{list.length > 4 && (
							<Link to="/friends/list" className="flex w-14 shrink-0 flex-col items-center gap-1.5">
								<div className="flex size-14 items-center justify-center rounded-full border-2 border-dashed border-[#A8B4AE] text-sm font-bold text-[#6B6375] dark:border-[#a0aec0]/40 dark:text-[#a0aec0]">
									+{list.length - 4}
								</div>
								<span className="text-[11px] font-semibold text-[#6B6375] dark:text-[#a0aec0]">
									More
								</span>
							</Link>
						)}
					</div>
				</CustomCard>
			)}

			<FriendRequestsCard />
		</>
	)
}

function FriendRequestsCard() {
	const { requests, isLoading, error, reload, removeLocally } = useFriendRequests("incoming")
	const [busyId, setBusyId] = React.useState<string | null>(null)
	const [actionError, setActionError] = React.useState<string | null>(null)

	const respond = async (request: FriendRequestSummary, accept: boolean) => {
		setBusyId(request.id)
		setActionError(null)
		try {
			if (accept) {
				await acceptFriendRequest(request.id)
			} else {
				await declineFriendRequest(request.id)
			}
			removeLocally(request.id)
		} catch (err) {
			setActionError(
				err instanceof Error ? err.message : "Could not respond to that request.",
			)
		} finally {
			setBusyId(null)
		}
	}

	if (isLoading) {
		return <LoadingCard label="Loading friend requests" />
	}

	if (error) {
		return <ErrorCard message={error} onRetry={reload} />
	}

	const list = requests ?? []
	if (list.length === 0) {
		return null
	}

	return (
		<CustomCard variant="navyBorder" size="sm">
			<SectionHead
				title="Friend Requests"
				meta={`(${list.length})`}
				to="/friends/add"
				linkLabel="Manage"
			/>

			{actionError && (
				<p className="mt-2 text-xs font-semibold text-[#AC2A5D] dark:text-[#ff6b9d]">
					{actionError}
				</p>
			)}

			<div className="mt-2 divide-y divide-[#E8EFEC] dark:divide-[#2d3449]">
				{list.map((request) => (
					<div key={request.id} className="flex items-center gap-3 py-3">
						<FriendAvatar displayName={request.senderDisplayName} size="md" />

						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-bold text-[#091828] dark:text-white">
								{request.senderDisplayName}
							</p>
							<p className="truncate text-xs text-[#6B6375] dark:text-[#a0aec0]">
								Wants to be friends
							</p>
						</div>

						<button
							type="button"
							disabled={busyId === request.id}
							onClick={() => void respond(request, true)}
							className="flex shrink-0 items-center gap-1 rounded-full border-2 border-[#091828] bg-[#FF6B9D] px-3 py-1.5 text-xs font-bold text-[#6E0034] shadow-[2px_3px_0_#091828] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 dark:border-[#2d3449] dark:shadow-[2px_3px_0_#060e20]"
						>
							<Check className="size-3.5" />
							Accept
						</button>

						<button
							type="button"
							disabled={busyId === request.id}
							onClick={() => void respond(request, false)}
							aria-label={`Decline request from ${request.senderDisplayName}`}
							className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-white text-[#6B6375] transition active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 dark:border-[#2d3449] dark:bg-[#1c263c] dark:text-[#a0aec0]"
						>
							<X className="size-3.5" />
						</button>
					</div>
				))}
			</div>
		</CustomCard>
	)
}


function LeaderboardTab() {
	const { entries, isLoading, error, reload } = useFriendsLeaderboard("score")

	if (isLoading) {
		return <LoadingCard label="Loading the leaderboard" />
	}

	if (error) {
		return <ErrorCard message={error} onRetry={reload} />
	}

	const list = entries ?? []
	if (list.length === 0) {
		return (
			<EmptyCard
				icon={<Trophy className="size-5" />}
				title="No leaderboard yet"
				description="Add a few friends and you will all show up here, ranked side by side."
			/>
		)
	}

	return (
		<CustomCard variant="navyBorder" size="sm">
			<SectionHead title="Friends ranking" to="/friends/leaderboard" />

			<div className="mt-2 divide-y divide-[#E8EFEC] dark:divide-[#2d3449]">
				{list.slice(0, 5).map((entry) => (
					<LeaderboardRow key={entry.userId} entry={entry} />
				))}
			</div>
		</CustomCard>
	)
}

function LeaderboardRow({ entry }: Readonly<{ entry: LeaderboardEntry }>) {
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

			<span className="shrink-0 text-sm font-bold text-[#091828] dark:text-white">
				{entry.value}
			</span>
		</div>
	)
}


function WagersTab() {
	const { wagers, isLoading, error, reload } = useWagers()

	if (isLoading) {
		return <LoadingCard label="Loading your challenges" />
	}

	if (error) {
		return <ErrorCard message={error} onRetry={reload} />
	}

	const list = wagers ?? []
	const pending = list.filter((w) => w.status === "PENDING")
	const active = list.filter((w) => w.status === "ACTIVE")

	if (list.length === 0) {
		return (
			<EmptyCard
				icon={<Swords className="size-5" />}
				title="No challenges yet"
				description="Challenge a friend to stake coins on a money habit and see who holds out."
				action={
					<LongButton
						LongVariant="primaryPinkBorder"
						LongSize="sm"
						showArrow={false}
						fullWidth={false}
						asChild
					>
						<Link to="/wagers/new">Start a challenge</Link>
					</LongButton>
				}
			/>
		)
	}

	return (
		<>
			{pending.length > 0 && (
				<CustomCard variant="navyBorder" size="sm">
					<SectionHead title="Invites" meta={`(${pending.length})`} to="/wagers" />
					<div className="mt-2 flex flex-col gap-2">
						{pending.slice(0, 3).map((wager) => (
							<WagerMiniRow key={wager.id} wager={wager} />
						))}
					</div>
				</CustomCard>
			)}

			{active.length > 0 && (
				<CustomCard variant="navyBorder" size="sm">
					<SectionHead title="Active" meta={`(${active.length})`} to="/wagers" />
					<div className="mt-2 flex flex-col gap-2">
						{active.slice(0, 3).map((wager) => (
							<WagerMiniRow key={wager.id} wager={wager} />
						))}
					</div>
				</CustomCard>
			)}

			<LongButton LongVariant="primaryDark" LongSize="md" showArrow={false} asChild>
				<Link to="/wagers">
					<Swords className="mr-2 size-4" />
					View all challenges
				</Link>
			</LongButton>
		</>
	)
}

function WagerMiniRow({ wager }: Readonly<{ wager: WagerSummary }>) {
	const opponentName = wager.isCreator ? wager.opponentDisplayName : wager.creatorDisplayName

	return (
		<Link
			to={`/wagers/${wager.id}`}
			className="flex items-center gap-3 rounded-xl border-2 border-[#091828] bg-[#FFE9B5] px-3 py-2.5 dark:border-[#2d3449] dark:bg-[#3f2e00]"
		>
			<FriendAvatar displayName={opponentName} size="sm" />

			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-bold text-[#091828] dark:text-[#ffd166]">
					vs {opponentName}
				</p>
				<p className="truncate text-xs text-[#6B6375] dark:text-[#ffdf9b]">
					{WAGER_TASK_LABELS[wager.taskType]}
				</p>
			</div>

			<span className="flex shrink-0 items-center gap-1 text-sm font-bold text-[#091828] dark:text-[#ffd166]">
				<Coins className="size-4 text-[#F2BF3C]" />
				{wager.stakeAmount}
			</span>
		</Link>
	)
}


function QuickLinksCard() {
	const links = [
		{
			to: "/friends/leaderboard",
			icon: <Trophy className="size-4" />,
			title: "View leaderboard",
			description: "See how you rank against your friends",
			tone: "bg-[#FFE9B5] text-[#7A5A00] dark:bg-[#3f2e00] dark:text-[#ffd166]",
		},
		{
			to: "/friends/add",
			icon: <UserPlus className="size-4" />,
			title: "Add a friend",
			description: "Search and send friend requests",
			tone: "bg-[#FCE0E8] text-[#AC2A5D] dark:bg-[#2d1b2e] dark:text-[#ff6b9d]",
		},
		{
			to: "/wagers/new",
			icon: <Swords className="size-4" />,
			title: "Start a challenge",
			description: "Stake coins on a money habit",
			tone: "bg-[#DCEFE8] text-[#16635A] dark:bg-[#0f4f42] dark:text-[#5eead4]",
		},
		{
			to: "/wagers",
			icon: <Medal className="size-4" />,
			title: "View challenges",
			description: "Invites, active wagers and results",
			tone: "bg-[#E8E4F4] text-[#5B4D8B] dark:bg-[#2d1b2e] dark:text-[#ff6b9d]",
		},
		{
			to: "/settings/preferences",
			icon: <Lock className="size-4" />,
			title: "Manage privacy",
			description: "Friends only ever see your public stats",
			tone: "bg-[#D7DEE4] text-[#3E4A55] dark:bg-[#1c263c] dark:text-[#dae2fd]",
		},
	]

	return (
		<CustomCard
			variant="navyBorder"
			size="sm"
			className={"border-dashed"}
		>
			<h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#AC2A5D] dark:text-[#ff6b9d]">
				From the hub you can also
			</h2>

			<div className="mt-3 flex flex-col gap-3">
				{links.map((link) => (
					<Link key={link.title} to={link.to} className="flex items-center gap-3">
						<div
							className={cn(
								"flex size-8 shrink-0 items-center justify-center rounded-full",
								link.tone,
							)}
						>
							{link.icon}
						</div>

						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-bold text-[#091828] dark:text-white">
								{link.title}
							</p>
							<p className="truncate text-xs text-[#6B6375] dark:text-[#a0aec0]">
								{link.description}
							</p>
						</div>
					</Link>
				))}
			</div>
		</CustomCard>
	)
}