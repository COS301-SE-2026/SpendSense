import * as React from "react"
import { Link } from "react-router-dom"
 
import { CustomCard } from "@/components/ui/CustomCard"
import { LongButton } from "@/components/common/LongButton"
import { FriendsPageShell } from "@/components/common/FriendsPageShell"
import { FilterChips } from "@/components/common/FilterChips"
import {
	ActivityRow,
	type ActivityItem,
	type ActivityScope,
} from "@/components/common/ActivityRow"


//TODO: replace with the real social activity feed endpoint.
const mockActivityFeed: ActivityItem[] = [
	{ id: "act-1", friendId: "alex-r", name: "Alex", initials: "AR", tone: "mint", action: "completed a quest", detail: "Log an Expense", reward: "+10 XP", rewardTone: "xp", timeAgo: "2m ago", scope: "friends" },
	{ id: "act-2", friendId: "jordan-l", name: "Jordan", initials: "JL", tone: "blue", action: "paid on time", detail: "Electricity Bill", reward: "+50 coins", rewardTone: "coins", timeAgo: "1h ago", scope: "friends" },
	{ id: "act-3", friendId: "sam-k", name: "Sam", initials: "SK", tone: "yellow", action: "unlocked a badge", detail: "Budget Boss", reward: "+1 badge", rewardTone: "badge", timeAgo: "3h ago", scope: "friends" },
	{ id: "act-4", friendId: "taylor-l", name: "Taylor", initials: "TL", tone: "pink", action: "completed a challenge", detail: "No Late Payments", reward: "+25 coins", rewardTone: "coins", timeAgo: "5h ago", scope: "friends" },
	{ id: "act-5", friendId: "casey-p", name: "Casey", initials: "CP", tone: "hotpink", action: "started a challenge", detail: "Save 100", reward: "+0 XP", rewardTone: "xp", timeAgo: "6h ago", scope: "following" },
	{ id: "act-6", friendId: "morgan-b", name: "Morgan", initials: "MB", tone: "slate", action: "hit a 7 day streak", detail: "Knowledge Streak", reward: "+15 XP", rewardTone: "xp", timeAgo: "8h ago", scope: "following" },
	{ id: "act-7", friendId: "riley-t", name: "Riley", initials: "RT", tone: "maroon", action: "unlocked a sticker", detail: "Saver Starter", reward: "+1 badge", rewardTone: "badge", timeAgo: "1d ago", scope: "following" },
]

export default function FriendActivityPage(){
    const [scope, setScope] = React.useState<ActivityScope | "all">("all")

    const visibleActivity = mockActivityFeed.filter((item)=> 
        scope=== "all" ? true : item.scope === scope
    )

    return (
        <FriendsPageShell title="Activity Feed" subtitle= "See what your friends are up to">
            <FilterChips
                active={scope}
                onChange={setScope}
                options={[
                    { key: "all", label: "All" },
					{ key: "friends", label: "Friends" },
					{ key: "following", label: "Following" }, //following would be people who's activity you want to watch like a celebrity thing (can be taken out)
                ]}
            />

            <CustomCard variant="navyBorder" size="sm">
                {visibleActivity.length === 0 ? (
                    <p className="text-sm text-[#6B6375]">Nothing here just yet</p>
                ) : (
                    <div className="divide-y divide-[#E8EFEC]">
                        {visibleActivity.map((item)=> (
                            <ActivityRow key={item.id} item={item}/>
                        ))}
                    </div>
                )}
            </CustomCard>

            <LongButton LongVariant="outline" LongSize="md" showArrow={false} asChild>
                <Link to="/friends/list">View All Friends</Link>
            </LongButton>
        </FriendsPageShell>
    )
}