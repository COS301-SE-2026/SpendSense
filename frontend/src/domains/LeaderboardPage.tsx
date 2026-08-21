import * as React from "react"
import { Link } from "react-router-dom"
import { Flame, Medal, Swords, Trophy } from "lucide-react"

import { CustomCard } from "@/components/ui/CustomCard"
import { LongButton } from "@/components/common/LongButton"
import { FriendsPageShell } from "@/components/common/FriendsPageShell"
import { FilterChips } from "@/components/common/FilterChips"
import { FriendAvatar } from "@/components/common/FriendAvatar"
import { EmptyCard, ErrorCard, LoadingCard } from "@/components/common/AsyncStates"
import { LeaderboardRow } from "@/components/common/LeaderboardRow"
import { cn } from "@/lib/utils"
import { useFriendsLeaderboard } from "@/hooks/useFriends"
import type { LeaderboardMetric } from "@/features/friends/friendsTypes"

//GET /friends/leaderboard?metric=score|streak.
//friend scoped only, a global leaderboard needs a privacy decision nobody has
//made yet, so it is not here (yet?)

export default function LeaderboardPage() {
	const [metric, setMetric] = React.useState<LeaderboardMetric>("score")
	const { entries, isLoading, error, reload } = useFriendsLeaderboard(metric)

	const list = entries ?? []
	const podium = list.slice(0, 3)
	const rest = list.slice(3)

	const podiumStyles = [
		{ bg: "bg-[#FFE9B5] dark:bg-[#3f2e00]", icon: "text-[#7A5A00] dark:text-[#ffd166]", height: "pt-6" },
		{ bg: "bg-[#E3EAE6] dark:bg-[#1c263c]", icon: "text-[#3E4A55] dark:text-[#dae2fd]", height: "pt-9" },
		{ bg: "bg-[#FCE0E8] dark:bg-[#2d1b2e]", icon: "text-[#AC2A5D] dark:text-[#ff6b9d]", height: "pt-9" },
	]

	return (
		<FriendsPageShell title="Leaderboard" subtitle="How you rank among your friends">
			<FilterChips
				active={metric}
				onChange={setMetric}
				options={[
					{ key: "score", label: "Score tier" },
					{ key: "streak", label: "Payment streak" },
				]}
			/>

			{isLoading && <LoadingCard label="Loading the leaderboard" />}

			{!isLoading && error && <ErrorCard message={error} onRetry={reload} />}

			{!isLoading && !error && list.length === 0 && (
				<EmptyCard
					icon={<Trophy className="size-5" />}
					title="Nothing to rank yet"
					description="Add some friends and you will all appear here, ranked side by side."
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
			)}

			{!isLoading && !error && list.length > 0 && (
				<>
					<CustomCard
						variant="navyBorder"
						size="sm"
						className="bg-[#E8E4F4] dark:bg-[#2d1b2e] dark:border-[#2d3449]"
					>
						<div className="flex items-center gap-3">
							<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white dark:bg-[#131b2e]">
								<Trophy className="size-5 text-[#5B4D8B] dark:text-[#ff6b9d]" />
							</div>

							<div className="min-w-0 flex-1">
								<p className="text-sm font-bold text-[#5B4D8B] dark:text-[#ff6b9d]">
									Friends Leaderboard
								</p>
								<p className="text-xs text-[#6B6375] dark:text-[#a0aec0]">
									{metric === "score"
										? "Ranked by credit score tier"
										: "Ranked by current payment streak"}
								</p>
							</div>
						</div>

						<div className="mt-4 grid grid-cols-3 items-end gap-2">
							{podium.map((entry, index) => (
								<div
									key={entry.userId}
									className={cn(
										"flex flex-col items-center gap-1 rounded-xl border-2 border-[#091828] px-2 pb-3 dark:border-[#2d3449]",
										podiumStyles[index].bg,
										podiumStyles[index].height,
									)}
								>
									<Medal className={cn("size-5", podiumStyles[index].icon)} />
									<span className="text-sm font-extrabold text-[#091828] dark:text-white">
										{entry.rank}
									</span>
									<FriendAvatar
										displayName={entry.displayName}
										avatarUrl={entry.avatarUrl}
										size="sm"
									/>
									<span className="w-full truncate text-center text-[11px] font-bold text-[#091828] dark:text-white">
										{entry.isSelf ? "You" : entry.displayName}
									</span>
									<span className="text-[11px] text-[#6B6375] dark:text-[#a0aec0]">
										{entry.value}
									</span>
								</div>
							))}
						</div>
					</CustomCard>

					{rest.length > 0 && (
						<CustomCard variant="navyBorder" size="sm">
							<div className="divide-y divide-[#E8EFEC] dark:divide-[#2d3449]">
								{rest.map((entry) => (
									<LeaderboardRow
										key={entry.userId}
										entry={entry}
										showStreakIcon={metric === "streak"}
									/>
								))}
							</div>
						</CustomCard>
					)}
				</>
			)}

			<CustomCard
				variant="navyBorder"
				size="sm"
				className={"flex items-center gap-3"}
			>
				<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FFE9B5] text-[#7A5A00] dark:bg-[#3f2e00] dark:text-[#ffd166]">
					<Flame className="size-5" />
				</div>

				<div className="min-w-0 flex-1">
					<p className="text-sm font-bold text-[#091828] dark:text-white">
						Climb the ranks
					</p>
					<p className="text-xs text-[#6B6375] dark:text-[#a0aec0]">
						Pay on time to build your streak and tier.
					</p>
				</div>
			</CustomCard>

			<LongButton LongVariant="primaryDark" LongSize="md" showArrow={false} asChild>
				<Link to="/wagers">
					<Swords className="mr-2 size-4" />
					View challenges
				</Link>
			</LongButton>
		</FriendsPageShell>
	)
}