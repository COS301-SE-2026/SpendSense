import * as React from "react"
import { Link } from "react-router-dom"
import { Users, UserPlus } from "lucide-react"

import { CustomCard } from "@/components/ui/CustomCard"
import { LongButton } from "@/components/common/LongButton"
import { FriendsPageShell } from "@/components/common/FriendsPageShell"
import { SearchBox } from "@/components/common/SearchBox"
import { FilterChips } from "@/components/common/FilterChips"
import { FriendRow, type Friend } from "@/components/common/FriendRow"

type ListFilter = "all" | "online" | "nearby"

//TODO: replace mock data
const mockFriends: Friend[] = [
	{ id: "alex-r", name: "Alex R.", initials: "AR", tone: "mint", online: true, nearby: true, lastSeen: "Online", score: 742, streakDays: 28, coins: 1250 },
	{ id: "sam-k", name: "Sam K.", initials: "SK", tone: "yellow", online: true, nearby: false, lastSeen: "Online", score: 615, streakDays: 19, coins: 870 },
	{ id: "jordan-l", name: "Jordan L.", initials: "JL", tone: "blue", online: false, nearby: true, lastSeen: "2m ago", score: 598, streakDays: 12, coins: 980 },
	{ id: "taylor-l", name: "Taylor L.", initials: "TL", tone: "pink", online: false, nearby: false, lastSeen: "5m ago", score: 520, streakDays: 9, coins: 705 },
	{ id: "casey-p", name: "Casey P.", initials: "CP", tone: "hotpink", online: false, nearby: false, lastSeen: "1h ago", score: 430, streakDays: 4, coins: 610 },
	{ id: "morgan-b", name: "Morgan B.", initials: "MB", tone: "slate", online: true, nearby: false, lastSeen: "Online", score: 402, streakDays: 6, coins: 560 },
	{ id: "riley-t", name: "Riley T.", initials: "RT", tone: "maroon", online: true, nearby: true, lastSeen: "Online", score: 388, streakDays: 3, coins: 540 },
	{ id: "avery-c", name: "Avery C.", initials: "AC", tone: "mint", online: false, nearby: false, lastSeen: "3h ago", score: 361, streakDays: 2, coins: 495 },
	{ id: "jamie-d", name: "Jamie D.", initials: "JD", tone: "blue", online: true, nearby: false, lastSeen: "Online", score: 344, streakDays: 7, coins: 470 },
	{ id: "kyle-m", name: "Kyle M.", initials: "KM", tone: "yellow", online: true, nearby: true, lastSeen: "Online", score: 320, streakDays: 5, coins: 455 },
	{ id: "sofia-n", name: "Sofia N.", initials: "SN", tone: "pink", online: false, nearby: false, lastSeen: "4h ago", score: 305, streakDays: 1, coins: 430 },
	{ id: "thabo-m", name: "Thabo M.", initials: "TM", tone: "slate", online: true, nearby: false, lastSeen: "Online", score: 298, streakDays: 11, coins: 415 },
	{ id: "lerato-k", name: "Lerato K.", initials: "LK", tone: "hotpink", online: true, nearby: false, lastSeen: "Online", score: 285, streakDays: 8, coins: 400 },
	{ id: "nadia-s", name: "Nadia S.", initials: "NS", tone: "mint", online: false, nearby: false, lastSeen: "6h ago", score: 271, streakDays: 2, coins: 385 },
	{ id: "priya-r", name: "Priya R.", initials: "PR", tone: "blue", online: true, nearby: false, lastSeen: "Online", score: 264, streakDays: 4, coins: 370 },
	{ id: "daniel-v", name: "Daniel V.", initials: "DV", tone: "maroon", online: false, nearby: false, lastSeen: "1d ago", score: 250, streakDays: 0, coins: 340 },
	{ id: "chloe-w", name: "Chloe W.", initials: "CW", tone: "yellow", online: true, nearby: false, lastSeen: "Online", score: 238, streakDays: 3, coins: 325 },
	{ id: "musa-d", name: "Musa D.", initials: "MD", tone: "pink", online: false, nearby: false, lastSeen: "1d ago", score: 226, streakDays: 0, coins: 310 },
	{ id: "hannah-b", name: "Hannah B.", initials: "HB", tone: "slate", online: true, nearby: false, lastSeen: "Online", score: 215, streakDays: 6, coins: 295 },
	{ id: "ethan-p", name: "Ethan P.", initials: "EP", tone: "mint", online: false, nearby: false, lastSeen: "2d ago", score: 204, streakDays: 0, coins: 280 },
	{ id: "zanele-x", name: "Zanele X.", initials: "ZX", tone: "hotpink", online: true, nearby: false, lastSeen: "Online", score: 190, streakDays: 2, coins: 265 },
	{ id: "liam-o", name: "Liam O.", initials: "LO", tone: "blue", online: false, nearby: false, lastSeen: "3d ago", score: 176, streakDays: 0, coins: 240 },
	{ id: "amara-j", name: "Amara J.", initials: "AJ", tone: "maroon", online: true, nearby: false, lastSeen: "Online", score: 162, streakDays: 1, coins: 225 },
]

const onlineCount = mockFriends.filter((f)=> f.online).length
const nearbyCount = mockFriends.filter((f)=> f.nearby).length

export default function FriendsListPage() {
    const [query, setQuery] = React.useState("")
    const [filter, setFilter] = React.useState<ListFilter>("all")

    const visibleFriends = mockFriends.filter((friend)=> {
        if(filter === "online"){
            return friend.online
        }
        if(filter === "nearby"){
            return friend.nearby
        }

        return true
    }).filter((friend)=> friend.name.toLowerCase().includes(query.trim().toLowerCase()))

    return (
        <FriendsPageShell 
            title={`Friends (${mockFriends.length})`} 
            subtitle="All friends, online status and streaks"
        >
            <SearchBox value={query} onChange={setQuery} placeHolder="Search friends..." />

            <FilterChips
                active={filter}
                onChange={setFilter}
                options={[
                    { key: "all", label: `All (${mockFriends.length})` },
                    { key: "online", label: `Online (${onlineCount})` },
                    { key: "nearby", label: `Nearby (${nearbyCount})` },
                ]}
            />

            <CustomCard variant="navyBorder" size="sm">
                {visibleFriends.length === 0 ? (
                    <div className="flex items-center gap-3">
                        <div className ="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#DCEFE8] text-[#16635A]">
                            <Users className="size-5"/>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-[#091828]">No friends found</p>
                            <p className="text-xs text-[#6B6375]">Try adjusting your search or filter</p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-[#E8EFEC]">
                        {visibleFriends.map((friend)=> (
                            <FriendRow key={friend.id} friend={friend}/>
                        ))}
                    </div>
                )}
            </CustomCard>

            <LongButton LongVariant="outline" LongSize="md" showArrow={false} asChild>
                <Link to="/friends/add">
                    <UserPlus className="mr-2 size-4"/>
                    Invite friends
                </Link>
            </LongButton>
        </FriendsPageShell>
    )
}