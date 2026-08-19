import { Link } from "react-router-dom"
import { Flame } from "lucide-react"

import { FriendAvatar, type AvatarTone } from "@/components/common/FriendAvatar"

export type Friend = {
    id: string
    name: string
    initials: string
    tone: AvatarTone
    online: boolean
    nearby: boolean
    lastSeen: string
    score: number
    streakDays: number
    coins: number
}

export function FriendRow({
    friend
}: Readonly<{
    friend: Friend
}>) {
    return(
        <Link to={`/friends/${friend.id}`} className="flex items-center gap-3 rounded-xl px-1 py-2.5 transition hover:bg-[#F4FBF7]">
            <FriendAvatar
                initials={friend.initials}
                tone={friend.tone}
                size="md"
                online={friend.online}
            />

            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#091828]">{friend.name}</p>
                <p className="truncate text-xs text-[#6B6375]">
                    {friend.online ? "Online" : friend.lastSeen}
                </p>
            </div>

            <div className ="flex shrink-0 items-center gap-1.5">
                <span className="text-sm font-bold text-[#091828]">{friend.score}</span>

                <Flame className={friend.streakDays > 0 ? "size-4 text-[#FF6B9D]" : "size-4 text-[#C4C6CC]"} />
            </div>
        </Link>
    )
}