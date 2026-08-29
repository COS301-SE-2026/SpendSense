import * as React from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Award, Flame, Swords, UserMinus } from "lucide-react"

import { CustomCard } from "@/components/ui/CustomCard"
import { LongButton } from "@/components/common/LongButton"
import { FriendsPageShell } from "@/components/common/FriendsPageShell"
import { FriendAvatar } from "@/components/common/FriendAvatar"
import { StatTile } from "@/components/common/StatTile"
import { ScoreTierPill } from "@/components/common/ScoreTierPill"
import { EmptyCard, ErrorCard, LoadingCard } from "@/components/common/AsyncStates"
import { useFriendProfile, useRemoveFriend } from "@/hooks/useFriends"
import { SCORE_TIER_LABELS } from "@/features/friends/friendsTypes"

//GET /friends/:friendId + DELETE /friends/:friendId.

export default function FriendProfilePage() {
	const { friendId } = useParams()
	const navigate = useNavigate()
	const { friend, isLoading, error, notFound, reload } = useFriendProfile(friendId)
	const { remove } = useRemoveFriend()

	const [confirmingRemove, setConfirmingRemove] = React.useState(false)
	const [removing, setRemoving] = React.useState(false)
	const [removeError, setRemoveError] = React.useState<string | null>(null)

	const handleRemove = async () => {
		if (!friendId) {
			return
		}
		setRemoving(true)
		setRemoveError(null)
		try {
			await remove(friendId)
			navigate("/friends/list")
		} catch (err) {
			setRemoveError(
				err instanceof Error ? err.message : "Could not remove this friend.",
			)
			setRemoving(false)
		}
	}

	if (isLoading) {
		return (
			<FriendsPageShell title="Friend Profile">
				<LoadingCard label="Loading profile" />
			</FriendsPageShell>
		)
	}

	if (notFound || !friend) {
		return (
			<FriendsPageShell title="Friend Profile">
				<EmptyCard
					icon={<UserMinus className="size-5" />}
					title="Profile not available"
					description="This person is not on your friends list, so their profile is private."
				/>

				<LongButton LongVariant="primaryDark" LongSize="md" showArrow={false} asChild>
					<Link to="/friends/list">Back to friends</Link>
				</LongButton>
			</FriendsPageShell>
		)
	}

	if (error) {
		return (
			<FriendsPageShell title="Friend Profile">
				<ErrorCard message={error} onRetry={reload} />
			</FriendsPageShell>
		)
	}

	return (
		<FriendsPageShell title={friend.displayName}>
			<CustomCard
				variant="navyBorder"
				size="md"
				className="bg-[#E8E4F4] dark:bg-[#2d1b2e] dark:border-[#2d3449]"
			>
				<div className="flex items-start justify-between gap-3">
					<FriendAvatar
						displayName={friend.displayName}
						avatarUrl={friend.avatarUrl}
						size="xl"
					/>

					<ScoreTierPill tier={friend.scoreTier} />
				</div>

				<p className="mt-3 text-lg font-extrabold text-[#091828] dark:text-white">
					{friend.displayName}
				</p>
				<p className="text-xs text-[#6B6375] dark:text-[#a0aec0]">
					Public profile - only their tier, streak and badges are shared.
				</p>

				<div className="mt-4 grid grid-cols-3 gap-2">
					<StatTile
						label="Tier"
						value={SCORE_TIER_LABELS[friend.scoreTier]}
					/>
					<StatTile
						label="Day Streak"
						value={friend.currentPaymentStreak}
						icon={<Flame className="size-3.5 text-[#FF6B9D]" />}
					/>
					<StatTile
						label="Badges"
						value={friend.badgeCount}
						icon={<Award className="size-3.5 text-[#5B4D8B] dark:text-[#ff6b9d]" />}
					/>
				</div>
			</CustomCard>

			<LongButton LongVariant="primaryDark" LongSize="md" showArrow={false} asChild>
				<Link to={`/wagers/new?opponentId=${encodeURIComponent(friend.friendId)}`}>
					<Swords className="mr-2 size-4" />
					Challenge {friend.displayName}
				</Link>
			</LongButton>

			{removeError && (
				<p className="text-xs font-semibold text-[#AC2A5D] dark:text-[#ff6b9d]">
					{removeError}
				</p>
			)}

			{confirmingRemove ? (
				<CustomCard
					variant="navyBorder"
					size="sm"
					className="dark:bg-[#131b2e] dark:border-[#2d3449]"
				>
					<p className="text-sm font-bold text-[#091828] dark:text-white">
						Remove {friend.displayName}?
					</p>
					<p className="mt-1 text-xs text-[#6B6375] dark:text-[#a0aec0]">
						You will both lose access to each other's stats. You can send a new
						request later.
					</p>

					<div className="mt-3 flex gap-2">
						<LongButton
							LongVariant="outline"
							LongSize="sm"
							showArrow={false}
							fullWidth={false}
							className="flex-1"
							disabled={removing}
							onClick={() => setConfirmingRemove(false)}
						>
							Cancel
						</LongButton>

						<LongButton
							LongVariant="primaryPinkBorder"
							LongSize="sm"
							showArrow={false}
							fullWidth={false}
							className="flex-1"
							disabled={removing}
							onClick={() => void handleRemove()}
						>
							{removing ? "Removing..." : "Remove"}
						</LongButton>
					</div>
				</CustomCard>
			) : (
				<LongButton
					LongVariant="outline"
					LongSize="md"
					showArrow={false}
					onClick={() => setConfirmingRemove(true)}
				>
					<UserMinus className="mr-2 size-4" />
					Remove Friend
				</LongButton>
			)}
		</FriendsPageShell>
	)
}