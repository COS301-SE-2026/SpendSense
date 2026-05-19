import {apiFetch} from '../../lib/api'

// gamificationApi: coins, XP, streaks, badges, and mascot state
// profile updates happen server-side after logPayment ( dont mutate directly from frontend)
// coins must not improve the credit score or erase score penalties

// planned endpoints:
// GET /api/v1/gamification/profile
// GET /api/v1/gamification/rewards

export async function getGamificationProfile(){
    return apiFetch('/gamification/profile')
}

export async function getRewards(params?: {page?: number; perPage?: number}){
    const query = new URLSearchParams()
    if(params?.page){
        query.set('page', String(params.page))
    }
    if(params?.perPage){
        query.set('perPage', String(params.perPage))
    }
    const qs = query.toString() ? `?${query.toString()}` : ''

    return apiFetch(`/gamification/rewards${qs}`)
}

export async function getBadges(){
    return apiFetch('/gamification/badges')
}