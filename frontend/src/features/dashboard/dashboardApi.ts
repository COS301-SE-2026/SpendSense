import {apiFetch} from '../../lib/api'

// dashboardApi: aggregated dashboard data
// single call replaces 8 separate calls on initial page load
// backend aggregates: credit score, gamification summary, upcoming payment counts, overdue counts, and recent activity
// must work even if the AI service not available

// planned endpoints:
// GET /api/v1/dashboard

export async function getDashboard(){
    return apiFetch('/dashboard')
}