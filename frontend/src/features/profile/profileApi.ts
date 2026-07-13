import {apiFetch} from '../../lib/api'

// profileApi: user identity, settings, and wrapped summaries
// PLACEHOLDER — these endpoints do not exist on the backend yet.
// The paths below are the planned contract; update if the backend names differ.
// planned endpoints:
// GET   /api/v1/users/me 
// PATCH /api/v1/users/me
// GET   /api/v1/users/me/settings
// PATCH /api/v1/users/me/settings
// GET   /api/v1/wrapped/latest

export interface UserProfile{
    displayName: string
    email: string
    memberSince: string
    level: number
    tier: string
}


export interface UserSettings{
    notifications:{
        friendRequests: boolean
        wrappedAnnouncements: boolean
        challengeReminders: boolean
        budgetAlerts: boolean
        marketing: boolean
    }
}

export interface WrappedSummary{
    month: string
    totalSaved: number
    transactions: number
    topCategory: string
    noSpendDays: number
}

export async function getUserProfile(){
    return apiFetch('/users/me')
}

export async function updateUserProfile(updates: Partial<Pick<UserProfile, 'displayName'>>){
    return apiFetch('/users/me', {method: 'PATCH', body: JSON.stringify(updates)})
}

export async function getUserSettings(){
    return apiFetch('/users/me/settings')
}

export async function updateUserSettings(updates: Partial<UserSettings>){
    return apiFetch('/users/me/settings', {method: 'PATCH', body: JSON.stringify(updates)})
}


export async function getLatestWrapped(){
    return apiFetch('/wrapped/latest')
}