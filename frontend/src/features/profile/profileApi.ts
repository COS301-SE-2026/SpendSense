import {apiFetch} from '../../lib/api'

// profileApi: user identity, settings, and wrapped summaries
// PLACEHOLDER - these endpoints do not exist on the backend yet.
// The paths below are the planned contract; update if the backend names differ.
// planned endpoints:
// GET   /api/v1/users/me/preferences
// PATCH /api/v1/users/me/deactivate
// PATCH /api/v1/users/me/export
// GET   /api/v1/wrapped/latest

export interface UserPreferences{
    theme: 'SYSTEM'|'LIGHT'|'DARK'
    currency: string
    language: string
    reducedMotion: boolean
}


export interface WrappedSummary{
    month: string
    totalSaved: number
    transactions: number
    topCategory: string
    noSpendDays: number
}


export async function updatePreferences(updates: Partial<UserPreferences>){
    return apiFetch('/users/me/preferences', {method: 'PATCH', body: JSON.stringify(updates)})
}

export async function deactivateAccount(){
    return apiFetch('/users/me/deactivate', {method: 'PATCH'})
}

export async function exportUserData(){
    return apiFetch('/users/me/export')
}


export async function getLatestWrapped(){
    return apiFetch('/wrapped/latest')
}