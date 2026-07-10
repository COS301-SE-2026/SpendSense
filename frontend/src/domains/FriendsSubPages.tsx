import * as React from "react"
import {Link,useNavigate, useParams} from "react-router-dom"
import {ArrowLeft,
        Users,
        //UserPlus,
        Trophy,
        Swords,
        Activity,
} from "lucide-react"

import { CustomCard } from "@/components/ui/CustomCard"
import {LongButton} from "@/components/common/LongButton"
import { CustomBadge } from "@/components/common/CustomBadges"


function PageShell({
    title,
    subtitle,
    children,
}: Readonly<{
    title: string
    subtitle?: string
    children: React.ReactNode
}>) {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-[#F4FB7] pb-24">
            <div className="mx-auto w-full max-w-md px-5 pt-6">
                <header className ="flex items-center gap-3">   

                    <button
                        type ="button"
                        aria-label= "Back"
                        onClick={() => navigate(-1)}
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FFD9E1] text-[#AC2A5D] transition hover:bg-[#FFB3C6] active:translate-y-px">
                            <ArrowLeft className="size-5" />
                    </button>
                    <div className="min-w-0">
                        <h1 className ="text-2xl font-extrabold leading-tight text-[#091828]">{title}</h1>
                        {subtitle && <p className="text-sm text-[#6b375]">{subtitle}</p>}

                    </div>
                </header>
                <div className="mt-6 flex flex-col gap-3">
                    {children}
                </div>
            </div>
        </div>
    )
}
   
//friends list

export function FriendsListPage() {
    return(
        <PageShell title="Friends" subtitle="All friends, online status and streaks">
            {/*TO DO: search input, filters, friend rows*/}

            <CustomCard variant="navyBorder" size="sm" className="flex items-center gap-3">
                <div className ="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#DCEFE8] text-[#091828]">
                    <Users className="size-5" />

                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#091828]">No friends yet</p>
                    <p className="text-xs text-[#6B6375]">Tap to view profile</p>
                </div>

                <CustomBadge variant="xp" size="sm">742</CustomBadge>

            </CustomCard>

            <LongButton LongVariant ="primaryDark" LongSize="md" showArrow={false} asChild>
                <Link to="/friends/add">Add Friend</Link>
            </LongButton>

        </PageShell>
    )
}


//add friend
export function AddFriendPage() {
    return(
        <PageShell title="Add Friend" subtitle="Search by username or email">
            {/*TO DO: search input, filters, friend rows*/}
            
            <CustomCard variant="navyBorder" size="sm" className="flex items-center gap-3">
                <div className ="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FFD8E6] text-[#AC2A5D]">
                    <Users className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#091828]">Suggested Friends</p>
                    <p className="text-xs text-[#6B6375]">No mutual friends yet</p>
                </div>

                <LongButton LongVariant ="primaryPinkBorder" LongSize="sm" showArrow={false} fullWidth={false}>
                    Add
                </LongButton>


            </CustomCard>
            <LongButton LongVariant= "outline" LongSize="md" showArrow={false}>
                Import Contacts
            </LongButton>

        </PageShell>

    )
}

//friend profile

export function FriendProfilePage() {
    const{friendId} =useParams()

    return(
        <PageShell title ="Friend Profile">
            <CustomCard variant ="navyBorder" size="md" className = "bg-[#E8E4F4] text-center">
                <p className ="text-lg font-extrabold text-[#091828]">Friend {friendId}</p>
                <div className = "mt-3 flex items-center justify-center gap-2 flex-wrap">
                    <CustomBadge variant ="xp" size ="sm">742 Score</CustomBadge>
                    <CustomBadge variant = "streak" size ="sm">5 Day Streak</CustomBadge>
                    <CustomBadge variant = "level" size ="sm">1250 coins</CustomBadge>
                </div>

            </CustomCard>

            <div className ="flex gap-2">
                <LongButton LongVariant ="outline" LongSize="sm" showArrow={false} fullWidth={false} className="flex-1">
                    Message
                </LongButton>
                <LongButton LongVariant ="primaryDark" LongSize="sm" showArrow={false} fullWidth={false} className="flex-1" asChild> 
                    <Link to="/quests"><Swords className="mr-1 size-4" />Challenge</Link>
                </LongButton>
            </div>

            {/*TO DO: recent activity list*/}

            <LongButton LongVariant="primaryYellow" LongSize="md" showArrow={false} asChild>
                <Link to="/friends/activity">View Activity</Link>
            </LongButton>

        </PageShell>
    )
}

//activity feed
export function FriendActivityPage() {
    return(
        <PageShell title ="Activity Feed" subtitle="See what your friends are up to">
            {/*TO DO: activity feed stuff*/}

            <CustomCard variant ="navyBorder" size="sm" className ="flex items-center gap-3">
                <div className ="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#E8E4F4] text-[#5B4DFF]">
                    <Activity className="size-5" />
                </div>

                <div className ="min-w-0 flex-1">
                    <p className ="text-sm font-bold text-[#091828]">No recent activity</p>
                    <p className ="text-xs text-[#6B6375]">Your friends haven't done anything yet</p>
                </div>

                <CustomBadge variant="xp" size="sm">+10 XP</CustomBadge>

            </CustomCard>

        </PageShell>
    )
}

//leaderboard


export function LeaderboardPage() {
    return(
        <PageShell title="Leaderboard" subtitle="Global and friends rankings">
            {/*TO DO: leaderboard stuff*/}

            <CustomCard variant="navyBorder" size="sm" className="flex items-center gap-3 bg-[#FFE9B5]">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[#7A5A00]">
                    <Trophy className="size-5" />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#091828]">No leaderboard data</p>
                    <p className="text-xs text-[#6B6375]">Top spender goes here</p>
                </div>

                <CustomBadge variant="xp" size="sm">+10 XP</CustomBadge>


            </CustomCard>

            {/*TO DO: ranking rows*/}

            <CustomCard variant="navyBorder" size="sm" className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#DCEFE8] text-[#091828]">
                    <Users className="size-5" />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#091828]">No friends yet</p>
                    <p className="text-xs text-[#6B6375]">Tap to view profile</p>
                </div>

                <CustomBadge variant="level" size="sm">1250</CustomBadge>

            </CustomCard>

            <LongButton LongVariant="primaryDark" LongSize="md" showArrow={false} asChild>
                <Link to="/quests">Start Challenges</Link>
            </LongButton>

        </PageShell>
    )
}
