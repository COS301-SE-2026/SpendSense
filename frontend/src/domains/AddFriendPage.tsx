import * as React from "react"
import { Check, Contact } from "lucide-react"

import { CustomCard } from "@/components/ui/CustomCard"
import { LongButton } from "@/components/common/LongButton"
import { FriendsPageShell } from "@/components/common/FriendsPageShell"
import { SearchBox } from "@/components/common/SearchBox"
import { FriendAvatar, type AvatarTone } from "@/components/common/FriendAvatar"

type SuggestedFriend = {
    id: string
    name: string
    initials: string
    tone: AvatarTone
    mutualFriends: number
}

//TODO: replace with the real friend suggestions endpoint.
const mockSuggestedFriends: SuggestedFriend[] = [
	{ id: "sug-jamie", name: "Jamie D.", initials: "JD", tone: "blue", mutualFriends: 5 },
	{ id: "sug-riley", name: "Riley T.", initials: "RT", tone: "maroon", mutualFriends: 4 },
	{ id: "sug-morgan", name: "Morgan B.", initials: "MB", tone: "slate", mutualFriends: 3 },
	{ id: "sug-avery", name: "Avery C.", initials: "AC", tone: "mint", mutualFriends: 2 },
	{ id: "sug-kyle", name: "Kyle M.", initials: "KM", tone: "yellow", mutualFriends: 2 },
]

export default function AddFriendPage() {
    const [query, setQuery] = React.useState("")

    //TODO: send a real friend request instead of just flipping local state
    const [requested, setRequested] = React.useState<string[]>([])

    const toggleRequest=(id: string)=> {
        setRequested((current)=> 
            current.includes(id) ? current.filter((r) => r !== id) : [...current, id]
        )
    }

    const suggestions = mockSuggestedFriends.filter((person)=> 
        person.name.toLowerCase().includes(query.trim().toLowerCase())
    )

    return (
        <FriendsPageShell title ="Add Friend" subtitle= "Search by name or email">
            <SearchBox
                value={query}
                onChange={setQuery}
                placeHolder="Search by name or email"
            />

            <CustomCard variant="navyBorder" size="sm">
                <h2 className="text-base font-extrabold text-[#091828]">Suggested for you</h2>
                
                <div className="mt-2 divide-y divide-[#E8EFEC]">
                    {suggestions.map((person)=>{
                        const isRequested = requested.includes(person.id)

                        return(
                            <div key={person.id} className="flex items-center gap-3 py-3">
                                <FriendAvatar initials={person.initials} tone={person.tone} size="md"/>

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold text-[#091828]">
                                        {person.name}
                                    </p>
                                    <p className="truncate text-xs text-[#6B6375]">
                                        {person.mutualFriends} mutual friends
                                    </p>
                                </div>

                                <LongButton
                                    LongVariant={isRequested ? "outline" : "primaryPinkBorder"}
                                    LongSize="sm"
                                    showArrow={false}
                                    fullWidth={false}
                                    onClick={()=> toggleRequest(person.id)}
                                >
                                    {isRequested ? (
                                        <>
                                            <Check className= "mr-1 size-3.5"/>
                                            Sent
                                        </>
                                    ) : (
                                        "Add"
                                    )}
                                </LongButton>

                            </div>

                        )
                    })}

                    {suggestions.length === 0 && (
                        <p className="py-4 text-sm text-[#6B6375]">
                            No one matches that search yet.
                        </p>
                    )}
                </div>
            </CustomCard>

            <LongButton LongVariant="outline" LongSize="md" showArrow={false}>
                <Contact className="mr-2 size-4"/>
                Import Contacts
            </LongButton>
        </FriendsPageShell>
    )
}