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

export async function updateMe(body: {displayName?: string; avatarUrl?: string | null; onboardingCompleted?: boolean}) {
    return apiFetch('/users/me', {method: 'PATCH', body: JSON.stringify(body)})
}