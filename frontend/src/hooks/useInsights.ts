import {useState, useEffect, useCallback} from 'react'
import {getInsights, type InsightCard, type InsightsResponse} from '@/features/insights/insightsApi'


interface UseInsightsReturn{
    asOf: string|null
    insights: InsightCard[]
    loading: boolean
    error: string|null
    refetch: ()=>void
}

interface Envelope<T>{data?: T}

export function useInsights(): UseInsightsReturn{
    const [asOf, setAsOf]=useState<string|null>(null)
    const [insights, setInsights]=useState<InsightCard[]>([])
    const [loading, setLoading]=useState(true)
    const [error, setError]=useState<string|null>(null)

    const fetchInsights=useCallback(async()=> {
        setLoading(true)
        setError(null)

        try{
            const raw =await getInsights() as Envelope<InsightsResponse>
            const payload=raw?.data
            setAsOf(payload?.asOf ?? null)
            setInsights(payload?.insights ?? [])
        }catch(err){
            setError(err instanceof Error? err.message: 'Failed to load insights')
            setAsOf(null)
            setInsights([])
        }finally {
            setLoading(false)
        }
    },[])

    useEffect(()=> {
        void fetchInsights()
    }, [fetchInsights])

    return {asOf, insights, loading, error, refetch: fetchInsights}
}