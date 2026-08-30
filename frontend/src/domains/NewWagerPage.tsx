import * as React from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Coins, Swords, Users } from "lucide-react"

import { CustomCard } from "@/components/ui/CustomCard"
import { LongButton } from "@/components/common/LongButton"
import { FriendsPageShell } from "@/components/common/FriendsPageShell"
import { FriendAvatar } from "@/components/common/FriendAvatar"
import { EmptyCard, ErrorCard, LoadingCard } from "@/components/common/AsyncStates"
import { cn } from "@/lib/utils"
import { useFriends } from "@/hooks/useFriends"
import { useGamificationProfile } from "@/hooks/useGamificationProfile"
import { createWager } from "@/features/friends/wagersApi"
import {
	WAGER_TASK_DESCRIPTIONS,
	WAGER_TASK_LABELS,
	type WagerTaskType,
} from "@/features/friends/friendsTypes"

//POST /wagers. opponent is pre-filled when arriving from a friend's profile
//via /wagers/new?opponentId=... , otherwise picked from the friend list

const TASK_TYPES: WagerTaskType[] = [
	"ALL_PAYMENTS_ON_TIME",
	"NO_MISSED_PAYMENTS",
	"MAINTAIN_PAYMENT_STREAK",
]

const STAKE_OPTIONS = [25, 50, 100, 200]
const DURATION_OPTIONS = [3, 7, 14, 30]

export default function NewWagerPage() {
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()
	const { friends, isLoading, error, reload } = useFriends()
	
	const { profile } = useGamificationProfile()
	const coinBalance = profile?.coins ?? null

	const [opponentId, setOpponentId] = React.useState(
		searchParams.get("opponentId") ?? "",
	)
	const [taskType, setTaskType] = React.useState<WagerTaskType>("ALL_PAYMENTS_ON_TIME")
	const [stakeAmount, setStakeAmount] = React.useState(50)
	const [durationDays, setDurationDays] = React.useState(7)
	const [submitting, setSubmitting] = React.useState(false)
	const [submitError, setSubmitError] = React.useState<string | null>(null)

	const list = friends ?? []
	const opponent = list.find((f) => f.friendId === opponentId)

	const submit = async () => {
		if (!opponentId) {
			setSubmitError("Pick a friend to challenge first.")
			return
		}
		setSubmitting(true)
		setSubmitError(null)
		try {
			const wager = await createWager({
				opponentId,
				taskType,
				stakeAmount,
				durationDays,
			})
			navigate(`/wagers/${wager.id}`)
		} catch (err) {
			//400 covers "not a friend" and "stake exceeds your balance"
			
			setSubmitError(
				err instanceof Error ? err.message : "Could not create that challenge.",
			)
			setSubmitting(false)
		}
	}

	return (
		<FriendsPageShell title="New Challenge" subtitle="Stake coins on a money habit">
			{isLoading && <LoadingCard label="Loading your friends" />}

			{!isLoading && error && <ErrorCard message={error} onRetry={reload} />}

			{!isLoading && !error && list.length === 0 && (
				<EmptyCard
					icon={<Users className="size-5" />}
					title="You need a friend first"
					description="Challenges are friends only. Add someone before starting one."
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
					<CustomCard variant="navyBorder" size="sm">
						<h2 className="text-base font-extrabold text-[#091828] dark:text-white">
							Opponent
						</h2>

						<div className="mt-3 flex flex-col gap-2">
							{list.map((friend) => {
								const selected = friend.friendId === opponentId
								return (
									<button
										key={friend.friendId}
										type="button"
										onClick={() => setOpponentId(friend.friendId)}
										aria-pressed={selected}
										className={cn(
											"flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition",
											selected
												? "border-[#091828] bg-[#FFD8E6] dark:border-[#ff6b9d] dark:bg-[#2d1b2e]"
												: "border-[#E8EFEC] bg-white hover:border-[#091828] dark:border-[#2d3449] dark:bg-[#1c263c]",
										)}
									>
										<FriendAvatar
											displayName={friend.displayName}
											avatarUrl={friend.avatarUrl}
											size="sm"
										/>
										<span className="min-w-0 flex-1 truncate text-sm font-bold text-[#091828] dark:text-white">
											{friend.displayName}
										</span>
									</button>
								)
							})}
						</div>
					</CustomCard>

					<CustomCard variant="navyBorder" size="sm">
						<h2 className="text-base font-extrabold text-[#091828] dark:text-white">
							The task
						</h2>

						<div className="mt-3 flex flex-col gap-2">
							{TASK_TYPES.map((type) => {
								const selected = type === taskType
								return (
									<button
										key={type}
										type="button"
										onClick={() => setTaskType(type)}
										aria-pressed={selected}
										className={cn(
											"rounded-xl border-2 px-3 py-2.5 text-left transition",
											selected
												? "border-[#091828] bg-[#DCEFE8] dark:border-[#5eead4] dark:bg-[#0f4f42]"
												: "border-[#E8EFEC] bg-white hover:border-[#091828] dark:border-[#2d3449] dark:bg-[#1c263c]",
										)}
									>
										<p className="text-sm font-bold text-[#091828] dark:text-white">
											{WAGER_TASK_LABELS[type]}
										</p>
										<p className="mt-0.5 text-xs text-[#6B6375] dark:text-[#a0aec0]">
											{WAGER_TASK_DESCRIPTIONS[type]}
										</p>
									</button>
								)
							})}
						</div>
					</CustomCard>

					<CustomCard variant="navyBorder" size="sm">
						<h2 className="text-base font-extrabold text-[#091828] dark:text-white">
							Stake
						</h2>
						<p className="mt-0.5 text-xs text-[#6B6375] dark:text-[#a0aec0]">
							Both of you stake this much. The winner takes the pot of{" "}
							{stakeAmount * 2} coins.
						</p>

						<div className="mt-3 flex flex-wrap gap-2">
							{STAKE_OPTIONS.map((amount) => {
								const unaffordable = coinBalance !== null && amount > coinBalance
								return (
									<OptionChip
										key={amount}
										selected={amount === stakeAmount}
										disabled={unaffordable}
										onClick={() => setStakeAmount(amount)}
									>
										<Coins className="size-3.5 text-[#F2BF3C]" />
										{amount}
									</OptionChip>
								)
							})}
						</div>

						{coinBalance !== null && (
							<p className="mt-2 text-xs text-[#6B6375] dark:text-[#a0aec0]">
								You have {coinBalance} coins.
							</p>
						)}

						<h3 className="mt-5 text-base font-extrabold text-[#091828] dark:text-white">
							Duration
						</h3>

						<div className="mt-3 flex flex-wrap gap-2">
							{DURATION_OPTIONS.map((days) => (
								<OptionChip
									key={days}
									selected={days === durationDays}
									onClick={() => setDurationDays(days)}
								>
									{days} days
								</OptionChip>
							))}
						</div>
					</CustomCard>

					<CustomCard
						variant="navyBorder"
						size="sm"
						className="bg-[#FFE9B5] dark:bg-[#3f2e00] dark:border-[#2d3449]"
					>
						<p className="text-sm font-bold text-[#091828] dark:text-[#ffd166]">
							{opponent
								? `Challenge ${opponent.displayName}`
								: "Pick a friend to challenge"}
						</p>
						<p className="mt-0.5 text-xs text-[#6B6375] dark:text-[#ffdf9b]">
							{WAGER_TASK_LABELS[taskType]} for {durationDays} days, {stakeAmount}{" "}
							coins each. No coins move until they accept.
						</p>
					</CustomCard>

					{submitError && (
						<p className="text-xs font-semibold text-[#AC2A5D] dark:text-[#ff6b9d]">
							{submitError}
						</p>
					)}

					<LongButton
						LongVariant="primaryDark"
						LongSize="md"
						showArrow={false}
						disabled={submitting || !opponentId}
						onClick={() => void submit()}
					>
						<Swords className="mr-2 size-4" />
						{submitting ? "Sending..." : "Send challenge"}
					</LongButton>
				</>
			)}
		</FriendsPageShell>
	)
}

function OptionChip({
	selected,
	onClick,
	disabled = false,
	children,
}: Readonly<{
	selected: boolean
	onClick: () => void
	disabled?: boolean
	children: React.ReactNode
}>) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			aria-pressed={selected}
			className={cn(
				"flex items-center gap-1 rounded-full border-2 px-3 py-1.5 text-xs font-bold transition",
				selected
					? "border-[#091828] bg-[#FF6B9D] text-[#6E0034] shadow-[2px_3px_0_#091828] dark:border-[#2d3449] dark:shadow-[2px_3px_0_#060e20]"
					: "border-[#E8EFEC] bg-white text-[#6B6375] hover:border-[#091828] dark:border-[#2d3449] dark:bg-[#1c263c] dark:text-[#a0aec0]",
				disabled && "cursor-not-allowed opacity-40 hover:border-[#E8EFEC]",
			)}
		>
			{children}
		</button>
	)
}