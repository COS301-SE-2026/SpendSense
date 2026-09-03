import * as React from "react"
import { Link } from "react-router-dom"
import { Check, X } from "lucide-react"

import { CustomCard } from "@/components/ui/CustomCard"
import { FriendAvatar } from "@/components/common/FriendAvatar"
import { ErrorCard, LoadingCard } from "@/components/common/AsyncStates"
import {
	useAcceptFriendRequest,
	useDeclineFriendRequest,
	useFriendRequests,
} from "@/hooks/useFriends"
import type { FriendRequestSummary } from "@/features/friends/friendsTypes"

//incoming friend requests with accept / decline.

export function FriendRequestsCard({
	title = "Friend requests",
	rowSubtitle,
	viewAllTo,
	viewAllLabel = "View all",
	emptyState = null,
	onAccepted,
}: Readonly<{
	title?: string
	rowSubtitle?: string
	viewAllTo?: string
	viewAllLabel?: string
	
	emptyState?: React.ReactNode

	onAccepted?: () => void
}>) {
	const { requests, isLoading, error, reload, removeLocally } =
		useFriendRequests("incoming")
	const { accept: acceptRequest } = useAcceptFriendRequest()
	const { decline: declineRequest } = useDeclineFriendRequest()
	const [busyId, setBusyId] = React.useState<string | null>(null)
	const [actionError, setActionError] = React.useState<string | null>(null)

	const respond = async (request: FriendRequestSummary, accept: boolean) => {
		setBusyId(request.id)
		setActionError(null)
		try {
			if (accept) {
				await acceptRequest(request.id)
			} else {
				await declineRequest(request.id)
			}
			removeLocally(request.id)
			if (accept) {
				onAccepted?.()
			}
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
		return <>{emptyState}</>
	}

	return (
		<CustomCard variant="navyBorder" size="sm">
			<div className="flex items-baseline justify-between gap-3">
				<h2 className="text-base font-extrabold text-[#091828] dark:text-white">
					{title}
					<span className="ml-1 text-sm font-bold text-[#6B6375] dark:text-[#a0aec0]">
						({list.length})
					</span>
				</h2>

				{viewAllTo && (
					<Link
						to={viewAllTo}
						className="text-xs font-bold text-[#AC2A5D] underline dark:text-[#ff6b9d]"
					>
						{viewAllLabel}
					</Link>
				)}
			</div>

			{actionError && (
				<p className="mt-2 text-xs font-semibold text-[#AC2A5D] dark:text-[#ffb4ab]">
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
							{rowSubtitle && (
								<p className="truncate text-xs text-[#6B6375] dark:text-[#a0aec0]">
									{rowSubtitle}
								</p>
							)}
						</div>

						<button
							type="button"
							disabled={busyId === request.id}
							onClick={() => void respond(request, true)}
							className="flex shrink-0 items-center gap-1 rounded-full border-2 border-[#091828] bg-[#FF6B9D] px-3 py-1.5 text-xs font-bold text-[#6E0034] shadow-[2px_3px_0_#091828] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 dark:border-[#060e20] dark:text-[#650030] dark:shadow-[2px_3px_0_#060e20]"
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