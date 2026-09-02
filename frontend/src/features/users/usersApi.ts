import {apiFetch} from '../../lib/api'

// usersApi: current user profile and bootstrap
// call getMe() immediately after login, creates the internal user record
// on first call if one does not exist yet (transaction: User, CreditProfile, GamificationProfile, UserPreference, NotificationPreference)

// planned endpoints:
// GET /api/v1/users/me
// PATCH /api/v1/users/me

export async function getMe(){
    return apiFetch('/users/me')
}

export async function checkDisplayName(displayName: string) {
    const query = encodeURIComponent(displayName.trim())
    const response = await apiFetch<{data: {available: boolean; reason?: 'taken' | 'prohibited'}}>(
        `/users/display-name/availability?displayName=${query}`
    )
    return response.data
}

export async function updateMe(body: {displayName?: string; avatarUrl?: string | null; onboardingCompleted?: boolean; montlyBudget: number;}) {
    return apiFetch('/users/me', {method: 'PATCH', body: JSON.stringify(body)})
}
