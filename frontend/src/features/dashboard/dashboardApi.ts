import { apiFetch } from '../../lib/api'
import type { ApiResponse } from '../../types'
import type { DashboardData } from '../../types/DashboardTypes'

// dashboardApi: aggregated dashboard data
// single call replaces 8 separate calls on initial page load
// backend aggregates: credit score, gamification summary, upcoming payment counts, overdue counts, and recent activity
// must work even if the AI service not available

// planned endpoints:
// GET /api/v1/dashboard

export async function getDashboard(): Promise<ApiResponse<DashboardData>> {
    return apiFetch<ApiResponse<DashboardData>>('/dashboard')
}