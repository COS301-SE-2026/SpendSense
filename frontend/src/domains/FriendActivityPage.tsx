import { Link } from "react-router-dom"
import { Activity, Swords } from "lucide-react"

import { LongButton } from "@/components/common/LongButton"
import { FriendsPageShell } from "@/components/common/FriendsPageShell"
import { EmptyCard } from "@/components/common/AsyncStates"

//the activity feed is deliberately NOT part of UC-A's committed tier.
//use case doc: keep an honest empty state rather than shipping a
//feed that looks real but is hardcoded. there is no endpoint behind this page
//on purpose, do not add mock rows here.

export default function FriendActivityPage() {
	return (
		<FriendsPageShell title="Activity Feed" subtitle="What your friends have been up to">
			<EmptyCard
				icon={<Activity className="size-5" />}
				title="No recent activity yet"
				description="Friend activity is not switched on yet. Challenges are the place to see what your friends are doing right now."
				action={
					<LongButton
						LongVariant="primaryPinkBorder"
						LongSize="sm"
						showArrow={false}
						fullWidth={false}
						asChild
					>
						<Link to="/wagers">View challenges</Link>
					</LongButton>
				}
			/>

			<LongButton LongVariant="outline" LongSize="md" showArrow={false} asChild>
				<Link to="/friends/list">View all friends</Link>
			</LongButton>

			<LongButton LongVariant="primaryDark" LongSize="md" showArrow={false} asChild>
				<Link to="/wagers/new">
					<Swords className="mr-2 size-4" />
					Start a challenge
				</Link>
			</LongButton>
		</FriendsPageShell>
	)
}