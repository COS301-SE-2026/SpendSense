import { Link } from "react-router-dom"
import { Coins, Swords, Timer, Trophy } from "lucide-react"

import { CustomCard } from "@/components/ui/CustomCard"
import { LongButton } from "@/components/common/LongButton"
import { FriendsPageShell } from "@/components/common/FriendsPageShell"
import { FriendAvatar } from "@/components/common/FriendAvatar"
import { EmptyCard, ErrorCard, LoadingCard } from "@/components/common/AsyncStates"
import { WagerStatusPill } from "@/components/common/WagerStatusPill"
import { useWagers } from "@/hooks/useWagers"
import {
	WAGER_TASK_LABELS,
	daysRemaining,
	type WagerSummary,
} from "@/features/friends/friendsTypes"

//GET /wagers - the caller's challenges, grouped pending / active / done

export default function WagersPage() {
	const { wagers, isLoading, error, reload } = useWagers()

	const list = wagers ?? []
	const pending = list.filter((w) => w.status === "PENDING")
	const active = list.filter((w) => w.status === "ACTIVE")
	const finished = list.filter(
		(w) =>
			w.status === "COMPLETED" ||
			w.status === "DECLINED" ||
			w.status === "CANCELLED" ||
			w.status === "EXPIRED",
	)

	return (
		<FriendsPageShell title="Challenges" subtitle="Stake coins against a friend">
			{isLoading && <LoadingCard label="Loading your challenges" />}

			{!isLoading && error && <ErrorCard message={error} onRetry={reload} />}

			{!isLoading && !error && list.length === 0 && (
				<EmptyCard
					icon={<Swords className="size-5" />}
					title="No challenges yet"
					description="Pick a friend, agree a money habit and stake some coins on who keeps it up."
				/>
			)}

			{!isLoading && !error && pending.length > 0 && (
				<WagerGroup title="Invites" wagers={pending} />
			)}

			{!isLoading && !error && active.length > 0 && (
				<WagerGroup title="Active" wagers={active} />
			)}

			{!isLoading && !error && finished.length > 0 && (
				<WagerGroup title="Finished" wagers={finished} />
			)}

			<LongButton LongVariant="primaryDark" LongSize="md" showArrow={false} asChild>
				<Link to="/wagers/new">
					<Swords className="mr-2 size-4" />
					New challenge
				</Link>
			</LongButton>
		</FriendsPageShell>
	)
}

function WagerGroup({
	title,
	wagers,
}: Readonly<{
	title: string
	wagers: WagerSummary[]
}>) {
	return (
		<CustomCard variant="navyBorder" size="sm">
			<h2 className="text-base font-extrabold text-[#091828] dark:text-white">
				{title}
				<span className="ml-1 text-sm font-bold text-[#6B6375] dark:text-[#a0aec0]">
					({wagers.length})
				</span>
			</h2>

			<div className="mt-3 flex flex-col gap-2">
				{wagers.map((wager) => (
					<WagerRow key={wager.id} wager={wager} />
				))}
			</div>
		</CustomCard>
	)
}

function WagerRow({ wager }: Readonly<{ wager: WagerSummary }>) {
	const opponentName = wager.isCreator
		? wager.opponentDisplayName
		: wager.creatorDisplayName
	const left = daysRemaining(wager.endDate)

	return (
		<Link
			to={`/wagers/${wager.id}`}
			className="flex items-center gap-3 rounded-xl border-2 border-[#091828] bg-white px-3 py-2.5 transition active:translate-x-[2px] active:translate-y-[2px] dark:border-[#2d3449] dark:bg-[#1c263c]"
		>
			<FriendAvatar displayName={opponentName} size="md" />

			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-bold text-[#091828] dark:text-white">
					vs {opponentName}
				</p>
				<p className="truncate text-xs text-[#6B6375] dark:text-[#a0aec0]">
					{WAGER_TASK_LABELS[wager.taskType]}
				</p>

				<div className="mt-1 flex items-center gap-3 text-[11px] text-[#6B6375] dark:text-[#a0aec0]">
					<span className="flex items-center gap-1">
						<Coins className="size-3.5 text-[#F2BF3C]" />
						{wager.stakeAmount}
					</span>

					{wager.status === "ACTIVE" && left !== null && (
						<span className="flex items-center gap-1">
							<Timer className="size-3.5" />
							{left === 0 ? "Settling" : `${left}d left`}
						</span>
					)}

					{wager.status === "COMPLETED" && (
						<span className="flex items-center gap-1">
							<Trophy className="size-3.5" />
							Pot {wager.stakeAmount * 2}
						</span>
					)}
				</div>
			</div>

			<WagerStatusPill wager={wager} />
		</Link>
	)
}