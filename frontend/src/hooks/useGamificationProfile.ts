import {useState, useEffect, useCallback} from 'react'
import {subscribeToCoinBalance} from '@/features/gamification/coinBalance'
import {getGamificationProfile} from '@/features/gamification/gamificationApi'

// GET /gamification/profile

export interface GamificationBadge{
    badgeKey: string
    name: string
    description: string
    category: string
    iconKey: string|null
    earnedAt: string
}

export interface GamificationProfile{
    coins: number
    xp: number
    mascotLevel: number
    mascotMood: string
    paymentStreak: number
    longestStreak: number
    knowledgeStreak: number
    longestKnowledgeStreak: number
    badges: GamificationBadge[]
}

interface UseGamificationProfileReturn{
    profile: GamificationProfile|null
    loading: boolean
    error: string | null
    refetch: ()=>void
}

export function useGamificationProfile(): UseGamificationProfileReturn{
    const [profile, setProfile] = useState<GamificationProfile|null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string|null>(null)

    const fetchProfile = useCallback(async()=>{
        setLoading(true)
        setError(null)
        try{
            const response = await getGamificationProfile()
            // single wrap'
            const raw = response as {data: GamificationProfile}
            const data = raw?.data
            if(!data) throw new Error('Unexpected response shape from /gamification/profile')
            setProfile({
                ...data,
                // ensure numbers
                coins: Number(data.coins),
                xp: Number(data.xp),
                paymentStreak: Number(data.paymentStreak),
                longestStreak: Number(data.longestStreak),
            })
        }
        catch(err){
            setError(err instanceof Error? err.message : 'Failed to load gamification profile')
            setProfile(null)
        }
        finally{
            setLoading(false)
        }
    }, [])

    useEffect(()=>{
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchProfile()
    }, [fetchProfile])

    //some endpoints (eg. accepting a wager) return the caller's new balance
    //inline, so take that number instead of re-fetching the whole profile
    useEffect(()=>{
        return subscribeToCoinBalance((coins)=>{
            setProfile((current)=> current ? {...current, coins} : current)
        })
    }, [])

    return{
        profile,
        loading,
        error,
        refetch: fetchProfile,
    }
}