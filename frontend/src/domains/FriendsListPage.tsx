import * as React from "react"
import { Link } from "react-router-dom"
import { Users, UserPlus } from "lucide-react"

import { CustomCard } from "@/components/ui/CustomCard"
import { LongButton } from "@/components/common/LongButton"
import { FriendsPageShell } from "@/components/common/FriendsPageShell"
import { SearchBox } from "@/components/common/SearchBox"
import { FriendRow } from "@/components/common/FriendRow"
import { EmptyCard, ErrorCard, LoadingCard } from "@/components/common/AsyncStates"
import { useFriends } from "@/hooks/useFriends"

//GET /friends. the contract's FriendSummary has no presence data, so there is
//no Online/Nearby filter here, the search box filters the loaded list locally.

export default function FriendsListPage() {
	const [query, setQuery] = React.useState("")
	const { friends, isLoading, error, reload } = useFriends()

	const list = friends ?? []
	const visibleFriends = list.filter((friend) =>
		friend.displayName.toLowerCase().includes(query.trim().toLowerCase()),
	)

	return (
		<FriendsPageShell
			title={isLoading || error ? "Friends" : `Friends (${list.length})`}
			subtitle="Your friends and their public stats"
		>
			{isLoading && <LoadingCard label="Loading your friends" />}

			{!isLoading && error && <ErrorCard message={error} onRetry={reload} />}

			{!isLoading && !error && list.length === 0 && (
				<EmptyCard
					icon={<Users className="size-5" />}
					title="No friends yet"
					description="Once you add someone, they will show up here with their tier, streak and badges."
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
					<SearchBox value={query} onChange={setQuery} placeHolder="Search friends" />

					<CustomCard
						variant="navyBorder"
						size="sm"
						>
						{visibleFriends.length === 0 ? (
							<div className="flex items-center gap-3">
								<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#DCEFE8] text-[#16635A] dark:bg-[#0f4f42] dark:text-[#5eead4]">
									<Users className="size-5" />
								</div>
								<div className="min-w-0 flex-1">
									<p className="text-sm font-bold text-[#091828] dark:text-white">
										No matches
									</p>
									<p className="text-xs text-[#6B6375] dark:text-[#a0aec0]">
										No friend's name matches "{query.trim()}".
									</p>
								</div>
							</div>
						) : (
							<div className="divide-y divide-[#E8EFEC] dark:divide-[#2d3449]">
								{visibleFriends.map((friend) => (
									<FriendRow key={friend.friendshipId} friend={friend} />
								))}
							</div>
						)}
					</CustomCard>
				</>
			)}

			<LongButton LongVariant="outline" LongSize="md" showArrow={false} asChild>
				<Link to="/friends/add">
					<UserPlus className="mr-2 size-4" />
					Add a friend
				</Link>
			</LongButton>
		</FriendsPageShell>
	)
}