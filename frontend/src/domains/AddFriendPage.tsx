import * as React from "react"
import { Check, Inbox, Search as SearchIcon, X } from "lucide-react"

import { CustomCard } from "@/components/ui/CustomCard"
import { LongButton } from "@/components/common/LongButton"
import { FriendsPageShell } from "@/components/common/FriendsPageShell"
import { SearchBox } from "@/components/common/SearchBox"
import { FriendAvatar } from "@/components/common/FriendAvatar"
import { EmptyCard, ErrorCard, LoadingCard } from "@/components/common/AsyncStates"
import { useFriendRequests, useFriendSearch } from "@/hooks/useFriends"
import {
	acceptFriendRequest,
	declineFriendRequest,
	sendFriendRequest,
} from "@/features/friends/friendsApi"
import type { FriendRequestSummary } from "@/features/friends/friendsTypes"

//GET /friends/search, POST /friends/requests, plus the incoming requests
//section with accept/decline.

export default function AddFriendPage() {
	const [query, setQuery] = React.useState("")
	const { results, isLoading, error, tooShort } = useFriendSearch(query)

	//ids we have already sent a request to in this session, so the button can
	//flip to "Sent" without a refetch (search excludes pending requests, but
	//only on the next call)
	const [sentTo, setSentTo] = React.useState<string[]>([])
	const [busyId, setBusyId] = React.useState<string | null>(null)
	const [sendError, setSendError] = React.useState<string | null>(null)

	const send = async (userId: string) => {
		setBusyId(userId)
		setSendError(null)
		try {
			await sendFriendRequest(userId)
			setSentTo((current) => [...current, userId])
		} catch (err) {
			setSendError(err instanceof Error ? err.message : "Could not send that request.")
		} finally {
			setBusyId(null)
		}
	}

	return (
		<FriendsPageShell title="Add Friend" subtitle="Search by name or email">
			<SearchBox
				value={query}
				onChange={setQuery}
				placeHolder="Search by name or email"
			/>

			{sendError && (
				<p className="text-xs font-semibold text-[#AC2A5D] dark:text-[#ff6b9d]">
					{sendError}
				</p>
			)}

			{tooShort && (
				<EmptyCard
					icon={<SearchIcon className="size-5" />}
					title="Search for someone"
					description="Type at least two characters of a name or email address to search."
				/>
			)}

			{!tooShort && isLoading && <LoadingCard label="Searching" />}

			{!tooShort && !isLoading && error && <ErrorCard message={error} />}

			{!tooShort && !isLoading && !error && results && results.length === 0 && (
				<EmptyCard
					icon={<SearchIcon className="size-5" />}
					title="No one found"
					description="Nobody matches that search. They may already be your friend, or have a request pending."
				/>
			)}

			{!tooShort && !isLoading && !error && results && results.length > 0 && (
				<CustomCard variant="navyBorder" size="sm">
					<h2 className="text-base font-extrabold text-[#091828] dark:text-white">
						Results
					</h2>

					<div className="mt-2 divide-y divide-[#E8EFEC] dark:divide-[#2d3449]">
						{results.map((person) => {
							const alreadySent = sentTo.includes(person.id)

							return (
								<div key={person.id} className="flex items-center gap-3 py-3">
									<FriendAvatar
										displayName={person.displayName}
										avatarUrl={person.avatarUrl}
										size="md"
									/>

									<p className="min-w-0 flex-1 truncate text-sm font-bold text-[#091828] dark:text-white">
										{person.displayName}
									</p>

									<LongButton
										LongVariant={alreadySent ? "outline" : "primaryPinkBorder"}
										LongSize="sm"
										showArrow={false}
										fullWidth={false}
										disabled={alreadySent || busyId === person.id}
										onClick={() => void send(person.id)}
									>
										{alreadySent ? (
											<>
												<Check className="mr-1 size-3.5" />
												Sent
											</>
										) : (
											"Add"
										)}
									</LongButton>
								</div>
							)
						})}
					</div>
				</CustomCard>
			)}

			<IncomingRequests />
		</FriendsPageShell>
	)
}

function IncomingRequests() {
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
		return (
			<EmptyCard
				icon={<Inbox className="size-5" />}
				title="No pending requests"
				description="When someone sends you a friend request, it will show up here."
			/>
		)
	}

	return (
		<CustomCard variant="navyBorder" size="sm">
			<h2 className="text-base font-extrabold text-[#091828] dark:text-white">
				Friend requests
				<span className="ml-1 text-sm font-bold text-[#6B6375] dark:text-[#a0aec0]">
					({list.length})
				</span>
			</h2>

			{actionError && (
				<p className="mt-2 text-xs font-semibold text-[#AC2A5D] dark:text-[#ff6b9d]">
					{actionError}
				</p>
			)}

			<div className="mt-2 divide-y divide-[#E8EFEC] dark:divide-[#2d3449]">
				{list.map((request) => (
					<div key={request.id} className="flex items-center gap-3 py-3">
						<FriendAvatar displayName={request.senderDisplayName} size="md" />

						<p className="min-w-0 flex-1 truncate text-sm font-bold text-[#091828] dark:text-white">
							{request.senderDisplayName}
						</p>

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