import {apiFetch} from '../../lib/api'

// creditApi: simulated financial health score and score event history
// score range is 300-850 (mirrors real ranges for educational familiarity)
// score events are append only, never user deletable
// label score as simulated in all frontend copy

// planned endpoints:
// GET /api/v1/credit-profile
// GET /api/v1/credit-profile/events

export async function getCreditProfile(){
    return apiFetch('/credit-profile')
}

export async function getScoreEvents(params?: {page?: number; perPage?: number}){
    const query = new URLSearchParams()
    if(params?.page){
        query.set('page', String(params.page))
    }
    if(params?.perPage){
        query.set('perPage', String(params.perPage))
    }
    const qs = query.toString() ? `?${query.toString()}` : ''

    return apiFetch(`/credit-profile/events${qs}`)
}