import * as React from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Check, Coins, Swords, Timer, Trophy, X } from "lucide-react"

import { CustomCard } from "@/components/ui/CustomCard"
import { LongButton } from "@/components/common/LongButton"
import { FriendsPageShell } from "@/components/common/FriendsPageShell"
import { FriendAvatar } from "@/components/common/FriendAvatar"
import { StatTile } from "@/components/common/StatTile"
import { EmptyCard, ErrorCard, LoadingCard } from "@/components/common/AsyncStates"
import { WagerStatusPill } from "@/components/common/WagerStatusPill"
import {
	useAcceptWager,
	useCancelWager,
	useDeclineWager,
	useWager,
} from "@/hooks/useWagers"
import {
	WAGER_TASK_DESCRIPTIONS,
	WAGER_TASK_LABELS,
	daysRemaining,
} from "@/features/friends/friendsTypes"

//GET /wagers/:id plus accept / decline / cancel.

export default function WagerDetailPage() {
	const { wagerId } = useParams()
	const navigate = useNavigate()

	//the hook polls on its own while the settlement job is pending
	const { wager, isLoading, error, notFound, awaitingSettlement, reload } =
		useWager(wagerId)
	const { accept: acceptRequest } = useAcceptWager()
	const { decline: declineRequest } = useDeclineWager()
	const { cancel: cancelRequest } = useCancelWager()

	const left = daysRemaining(wager?.endDate ?? null)

	const [busy, setBusy] = React.useState(false)
	const [actionError, setActionError] = React.useState<string | null>(null)
	const [newBalance, setNewBalance] = React.useState<number | null>(null)

	const runAction = async (action: "accept" | "decline" | "cancel") => {
		if (!wagerId) {
			return
		}
		setBusy(true)
		setActionError(null)
		try {
			if (action === "accept") {
				const result = await acceptRequest(wagerId)
				setNewBalance(result.coinBalance)
			} else if (action === "decline") {
				await declineRequest(wagerId)
			} else {
				await cancelRequest(wagerId)
				navigate("/wagers")
			}
		} catch (err) {
			setActionError(
				err instanceof Error ? err.message : "That action did not go through.",
			)
		} finally {
			setBusy(false)
		}
	}

	if (isLoading) {
		return (
			<FriendsPageShell title="Challenge">
				<LoadingCard label="Loading this challenge" />
			</FriendsPageShell>
		)
	}

	if (notFound || !wager) {
		return (
			<FriendsPageShell title="Challenge">
				<EmptyCard
					icon={<Swords className="size-5" />}
					title="Challenge not available"
					description="This challenge does not exist, or you are not part of it."
				/>

				<LongButton LongVariant="primaryDark" LongSize="md" showArrow={false} asChild>
					<Link to="/wagers">Back to challenges</Link>
				</LongButton>
			</FriendsPageShell>
		)
	}

	if (error) {
		return (
			<FriendsPageShell title="Challenge">
				<ErrorCard message={error} onRetry={reload} />
			</FriendsPageShell>
		)
	}

	const opponentName = wager.isCreator
		? wager.opponentDisplayName
		: wager.creatorDisplayName
	const myOutcome = wager.isCreator ? wager.creatorOutcome : wager.opponentOutcome

	//only the invited side sees Accept/Decline, only the creator sees Cancel,
	//and both only while the wager is still PENDING
	const canRespond = !wager.isCreator && wager.status === "PENDING"
	const canCancel = wager.isCreator && wager.status === "PENDING"

	return (
		<FriendsPageShell title="Challenge">
			<CustomCard
				variant="navyBorder"
				size="md"
				className="bg-[#FFE9B5] dark:bg-[#3f2e00] dark:border-[#2d3449]"
			>
				<div className="flex items-start justify-between gap-3">
					<FriendAvatar displayName={opponentName} size="lg" />
					<WagerStatusPill wager={wager} />
				</div>

				<p className="mt-3 text-lg font-extrabold text-[#091828] dark:text-[#ffd166]">
					vs {opponentName}
				</p>
				<p className="text-xs text-[#6B6375] dark:text-[#ffdf9b]">
					{wager.isCreator ? "You started this one" : `${opponentName} challenged you`}
				</p>

				<div className="mt-4 grid grid-cols-3 gap-2">
					<StatTile
						label="Stake each"
						value={wager.stakeAmount}
						icon={<Coins className="size-3.5 text-[#F2BF3C]" />}
					/>
					<StatTile
						label="Pot"
						value={wager.stakeAmount * 2}
						icon={<Trophy className="size-3.5 text-[#7A5A00] dark:text-[#ffd166]" />}
					/>
					<StatTile
						label={wager.status === "ACTIVE" ? "Days left" : "Duration"}
						value={
							wager.status === "ACTIVE" && left !== null
								? left
								: `${wager.durationDays}d`
						}
						icon={<Timer className="size-3.5 text-[#6B6375] dark:text-[#a0aec0]" />}
					/>
				</div>
			</CustomCard>

			<CustomCard variant="navyBorder" size="sm">
				<h2 className="text-base font-extrabold text-[#091828] dark:text-white">
					{WAGER_TASK_LABELS[wager.taskType]}
				</h2>
				<p className="mt-1 text-xs text-[#6B6375] dark:text-[#a0aec0]">
					{WAGER_TASK_DESCRIPTIONS[wager.taskType]}
				</p>

				{wager.status === "PENDING" && (
					<p className="mt-3 text-xs font-semibold text-[#7A5A00] dark:text-[#ffd166]">
						No coins move until it is accepted.
					</p>
				)}

				{wager.status === "ACTIVE" && (
					<p className="mt-3 text-xs font-semibold text-[#1E4FAE] dark:text-[#dae2fd]">
						Both stakes are held until the challenge ends. It settles on its own,
						there is nothing to submit.
					</p>
				)}

				{awaitingSettlement && (
					<p className="mt-2 text-xs text-[#6B6375] dark:text-[#a0aec0]">
						The window has closed. Checking for the result...
					</p>
				)}

				{wager.status === "COMPLETED" && myOutcome && (
					<p className="mt-3 text-sm font-bold text-[#091828] dark:text-white">
						{myOutcome === "WON" &&
							`You won ${wager.stakeAmount * 2} coins.`}
						{myOutcome === "LOST" &&
							`${opponentName} took the pot this time.`}
						{myOutcome === "DRAW" &&
							"A draw, so both stakes went back where they came from."}
					</p>
				)}
			</CustomCard>

			{newBalance !== null && (
				<CustomCard
					variant="navyBorder"
					size="sm"
					className="bg-[#DCEFE8] dark:bg-[#0f4f42] dark:border-[#2d3449]"
				>
					<p className="text-sm font-bold text-[#16635A] dark:text-[#5eead4]">
						Challenge accepted. Your balance is now {newBalance} coins.
					</p>
				</CustomCard>
			)}

			{actionError && (
				<p className="text-xs font-semibold text-[#AC2A5D] dark:text-[#ff6b9d]">
					{actionError}
				</p>
			)}

			{canRespond && (
				<div className="flex gap-2">
					<LongButton
						LongVariant="outline"
						LongSize="sm"
						showArrow={false}
						fullWidth={false}
						className="flex-1"
						disabled={busy}
						onClick={() => void runAction("decline")}
					>
						<X className="mr-1 size-4" />
						Decline
					</LongButton>

					<LongButton
						LongVariant="primaryDark"
						LongSize="sm"
						showArrow={false}
						fullWidth={false}
						className="flex-1"
						disabled={busy}
						onClick={() => void runAction("accept")}
					>
						<Check className="mr-1 size-4" />
						{busy ? "Working..." : `Accept (${wager.stakeAmount})`}
					</LongButton>
				</div>
			)}

			{canCancel && (
				<LongButton
					LongVariant="outline"
					LongSize="md"
					showArrow={false}
					disabled={busy}
					onClick={() => void runAction("cancel")}
				>
					<X className="mr-2 size-4" />
					Cancel challenge
				</LongButton>
			)}

			<LongButton LongVariant="primaryYellow" LongSize="md" showArrow={false} asChild>
				<Link to="/wagers">All challenges</Link>
			</LongButton>
		</FriendsPageShell>
	)
}