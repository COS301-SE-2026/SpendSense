import {apiFetch} from '../../lib/api'

//GET /api/v1/insights

export type InsightSeverity='positive'|'info'|'warning'|'critical'

export type InsightKey=
    | 'on-time-rate'
    | 'obligation-trend'
    | 'upcoming-pressure'
    | 'category-breakdown'
    | 'payment-streak'

export interface InsightCard{
    key: InsightKey
    title: string
    value: string
    explanation: string
    severity: InsightSeverity
    link?: string
}

export interface InsightsResponse{
    asOf: string
    insights: InsightCard[]
}

export async function getInsights(){
    return apiFetch('/insights')
}