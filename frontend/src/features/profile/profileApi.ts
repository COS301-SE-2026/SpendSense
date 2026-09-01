import {apiDataFetch,apiFetch} from '../../lib/api'

// profileApi: user identity, settings, and wrapped summaries
// endpoints:
// PATCH  /users/me/preferences
// PATCH  /users/me/deactivate
// GET    /users/me/export
// DELETE /users/me/data
// GET    /wrapped/latest

export interface UserPreferences{
    theme: 'SYSTEM'|'LIGHT'|'DARK'
    currency: string
    language: string
    reducedMotion: boolean
}

export type ScoreTier='BUILDING'|'FAIR'|'GOOD'|'EXCELLENT'|'ELITE'

export interface WrappedSummary{
    month:number
    monthLabel:string
    scoreStart:number
    scoreEnd:number
    scoreDelta:number
    scoreTierEnd:ScoreTier|null
    onTimePayments:number
    latePayments:number
    missedPayments:number
    onTimePaymentRate:number
    longestPaymentStreakThisMonth:number
    numberBadgesEarned:number
    arrayBadgesEarned:WrappedBadge[]
    coinsEarned:number
    coinEvents:WrappedCoinEvent[]
    quizzesCompleted:number
    knowledgeStreakEnd:number
    hasData:boolean
}

export interface WrappedBadge{
    badgeKey:string
    name:string
    iconKey:string|null
    earnedAt:string
}

export interface WrappedCoinEvent{
    eventType:string
    amount:number
    reason:string
    earnedAt:string
}

export async function updatePreferences(updates:Partial<UserPreferences>){
    return apiFetch('/users/me/preferences',{method:'PATCH',body:JSON.stringify(updates)})
}

export async function deactivateAccount(){
    return apiFetch('/users/me/deactivate',{method:'PATCH'})
}

export async function exportUserData(){
    return apiFetch('/users/me/export')
}


export interface DataDeletionReceipt{
    data: {
        deleted: boolean
        deletedAt: string
        recordsDeleted: Record<string, number>
    }
}

// POPIA s24 deletion request. Destroys the account and every record attached
// to it. Nothing is recoverable afterwards, so callers should sign the user
// out immediately.
export async function deleteAllUserData(){
    return apiFetch<DataDeletionReceipt>('/users/me/data', {method: 'DELETE'})
}


export async function getLatestWrapped(){
    return apiDataFetch<WrappedSummary>('/wrapped/latest')
}