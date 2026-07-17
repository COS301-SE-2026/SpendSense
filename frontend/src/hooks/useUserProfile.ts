import {useState, useEffect, useCallback} from 'react'
import {getMe} from '@/features/users/usersApi'

//profile page data from GET /users/me

export interface ProfileData{
    displayName: string
    email: string
    avatarUrl: string|null
    memberSince: string
    level: number
    tier: string
    coins: number
    paymentStreak: number
    preferences: {
        theme: string
        currency: string
        language: string
        reducedMotion: boolean
    }|null
}

interface MeResponse{
    data?: {
        user?: {
            email?: string
            displayName?: string|null
            avatarUrl?: string|null
            createdAt?: string
        }
        preferences?: ProfileData['preferences']
        creditProfile?: {scoreTier?: string}
        gamificationProfile?: {
            mascotLevel?: number
            coinBalance?: number
            currentPaymentStreak?: number
        }
    }
}


function formatTier (scoreTier: string|undefined): string{
    if(!scoreTier) return 'Building'
    const lower= scoreTier.toLowerCase()
    return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function formatMemberSince(iso: string|undefined): string{
    if(!iso) return ''
    return new Date(iso).toLocaleDateString('en-ZA', {month: 'long', year: 'numeric'})
}

interface UseUserProfileReturn{
    user: ProfileData|null
    loading: boolean
    error: string|null
    refetch: ()=>void
}


export function useUserProfile(): UseUserProfileReturn{
    const[user, setUser]= useState<ProfileData|null>(null)
    const[loading, setLoading] =useState(true)
    const[error, setError]= useState<string|null>(null)

    const fetchUser= useCallback(async()=>{
        setLoading(true)
        setError(null)

        try{
            const raw = await getMe() as MeResponse
            const me= raw?.data ?? {}

            setUser({
                displayName: me.user?.displayName ?? me.user?.email?.split('@')[0] ?? 'User',
                email: me.user?.email ?? '',
                avatarUrl: me.user?.avatarUrl ?? null,
                memberSince: formatMemberSince(me.user?.createdAt),
                level: Number(me.gamificationProfile?.mascotLevel ?? 1),
                tier: formatTier(me.creditProfile?.scoreTier),
                coins: Number(me.gamificationProfile?.coinBalance ?? 0),
                paymentStreak: Number(me.gamificationProfile?.currentPaymentStreak ?? 0),
                preferences: me.preferences ?? null,
            })
        }
        catch(e){
            setError(e instanceof Error? e.message: 'Failed to load profile')
            setUser(null)
        }
        finally{
            setLoading(false)
        }
    }, [])
    useEffect(()=>{
        void fetchUser()
    }, [fetchUser])

    return {user, loading, error, refetch: fetchUser}
}

export function initialsFor(name: string): string{
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0,2)
        .map((part)=>part[0]?.toUpperCase() ?? '')
        .join('') || 'U'
}