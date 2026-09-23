import {MascotAvatar} from '@/components/mascot/MascotAvatar'
import {useGamificationProfile} from '@/hooks/useGamificationProfile'
import {isMascotMood} from '@/lib/mascot'

export function GuidanceMascot({className='size-12'}:Readonly<{className?:string}>){
    const {profile}=useGamificationProfile()
    const mood=isMascotMood(profile?.mascotMood)? profile.mascotMood : 'NEUTRAL'
    const equipped=(profile?.equippedCosmetics??[]).map((item)=>({slot:item.slot,code:item.code}))

    return <MascotAvatar mood={mood} equipped={equipped} size="sm" className={className}/>
}