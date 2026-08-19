import { Link, useParams } from "react-router-dom"
import { MessageCircle, Swords } from "lucide-react"
 
import { CustomCard } from "@/components/ui/CustomCard"
import { LongButton } from "@/components/common/LongButton"
import { CustomBadge } from "@/components/common/CustomBadges"
import { FriendsPageShell } from "@/components/common/FriendsPageShell"
import { FriendAvatar } from "@/components/common/FriendAvatar"
import { ActivityRow, type ActivityItem } from "@/components/common/ActivityRow"
import type { Friend } from "@/components/common/FriendRow"

//TO DO: replace with a fetch of the friend profile by id.
//currently not all friends have profiles
const mockProfiles: Record<string, Friend> = {
	"alex-r": { id: "alex-r", name: "Alex R.", initials: "AR", tone: "mint", online: true, nearby: true, lastSeen: "Online", score: 742, streakDays: 28, coins: 1250 },
	"sam-k": { id: "sam-k", name: "Sam K.", initials: "SK", tone: "yellow", online: true, nearby: false, lastSeen: "Online", score: 615, streakDays: 19, coins: 870 },
	"jordan-l": { id: "jordan-l", name: "Jordan L.", initials: "JL", tone: "blue", online: false, nearby: true, lastSeen: "2m ago", score: 598, streakDays: 12, coins: 980 },
	"taylor-l": { id: "taylor-l", name: "Taylor L.", initials: "TL", tone: "pink", online: false, nearby: false, lastSeen: "5m ago", score: 520, streakDays: 9, coins: 705 },
	"casey-p": { id: "casey-p", name: "Casey P.", initials: "CP", tone: "hotpink", online: false, nearby: false, lastSeen: "1h ago", score: 430, streakDays: 4, coins: 610 },
}

//TODO: replace with that friend's recent activity from the backend.
const mockRecentActivity: ActivityItem[] = [
	{ id: "prof-act-1", friendId: "alex-r", name: "Alex", initials: "AR", tone: "mint", action: "Completed quest", detail: "Log an Expense", reward: "+10 XP", rewardTone: "xp", timeAgo: "2m ago", scope: "friends" },
	{ id: "prof-act-2", friendId: "alex-r", name: "Alex", initials: "AR", tone: "mint", action: "Paid on time", detail: "Water Bill", reward: "+50 coins", rewardTone: "coins", timeAgo: "1h ago", scope: "friends" },
	{ id: "prof-act-3", friendId: "alex-r", name: "Alex", initials: "AR", tone: "mint", action: "Unlocked badge", detail: "Budget Boss", reward: "+1 badge", rewardTone: "badge", timeAgo: "3h ago", scope: "friends" },
]

export default function FriendProfilePage() {
    const { friendId } = useParams()
    const friend = friendId ? mockProfiles[friendId] : undefined
    const activity = mockRecentActivity

    if(!friend){
        return (
            <FriendsPageShell title ="Friend Profile">
                <CustomCard variant="navyBorder" size="md" className="text-center">
					<p className="text-sm font-bold text-[#091828]">Friend not found</p>
					<p className="mt-1 text-xs text-[#6B6375]">
						This profile is not in your friends list yet.
					</p>
				</CustomCard>
 
				<LongButton LongVariant="primaryDark" LongSize="md" showArrow={false} asChild>
					<Link to="/friends/list">Back to friends</Link>
				</LongButton>
            </FriendsPageShell>
        )
    }

    return (
		<FriendsPageShell title={friend.name}>
			<CustomCard variant="navyBorder" size="md" className="bg-[#E8E4F4]">
				<div className="flex items-start justify-between gap-3">
					<FriendAvatar
						initials={friend.initials}
						tone={friend.tone}
						size="xl"
						online={friend.online}
					/>
 
					<CustomBadge variant="tier" size="sm">
						Top 1%
					</CustomBadge>
				</div>
 
				<p className="mt-3 text-lg font-extrabold text-[#091828]">{friend.name}</p>
				<p className="text-xs text-[#6B6375]">
					{friend.online ? "Online now" : `Last seen ${friend.lastSeen}`}
				</p>
 
				<div className="mt-4 grid grid-cols-3 gap-2">
					<ProfileStat label="Score" value={friend.score} />
					<ProfileStat label="Day Streak" value={friend.streakDays} />
					<ProfileStat label="Coins" value={friend.coins} />
				</div>
			</CustomCard>
 
			<div className="flex gap-2">
				<LongButton
					LongVariant="outline"
					LongSize="sm"
					showArrow={false}
					fullWidth={false}
					className="flex-1"
				>
                    {/*messaging not necessary but could be cool*/}
					<MessageCircle className="mr-1 size-4" />
					Message
				</LongButton>
 
				<LongButton
					LongVariant="primaryDark"
					LongSize="sm"
					showArrow={false}
					fullWidth={false}
					className="flex-1"
					asChild
				>
					<Link to="/quests">
						<Swords className="mr-1 size-4" />
						Challenge
					</Link>
				</LongButton>
			</div>
 
			<CustomCard variant="navyBorder" size="sm">
				<h2 className="text-base font-extrabold text-[#091828]">Recent Activity</h2>
 
				<div className="mt-2 divide-y divide-[#E8EFEC]">
					{activity.map((item) => (
						<ActivityRow key={item.id} item={item} showName={false} />
					))}
				</div>
			</CustomCard>
 
			<LongButton LongVariant="primaryYellow" LongSize="md" showArrow={false} asChild>
				<Link to="/friends/activity">View Full Activity</Link>
			</LongButton>
		</FriendsPageShell>
	)
}
 
function ProfileStat({
	label,
	value,
}: Readonly<{
	label: string
	value: number
}>) {
	return (
		<div className="rounded-xl border-2 border-[#091828] bg-white px-2 py-3 text-center">
			<p className="text-lg font-extrabold text-[#091828]">{value}</p>
			<p className="text-[11px] text-[#6B6375]">{label}</p>
		</div>
	)
}
 


