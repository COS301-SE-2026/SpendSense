import {useState, useCallback, useEffect} from 'react'
import {getUpcomingOccurrences} from '@/features/payments/paymentsApi'


//this endpoint will double wrap: response.data.data is array, response.data.meta is the pagination object
// this will handle the extraction so CalendarPage wont have tp

export interface CalendarOccurrence{
    id: string
    dueDate: string
    amountDue: number
    currency: string
    status: 'OVERDUE'|'PAID'|'PENDING'|'MISSED'|'PAID_LATE'|'CANCELLED'
    sequenceNumber: number
    daysUntilDue: number
    riskLevel: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'
    obligation:{
        id: string
        name:string
        type: string
        priority: string
    }
    reminders:{
        id: string
        scheduledFor: string
        status: string
        channel: string
    }[]
}

interface UseCalendarOccurrencesReturn{
    occurrences: CalendarOccurrence[]
    loading: boolean
    error: string|null
    displayYear: number
    displayMonth: number
    goToPreviousMonth: ()=>void
    goToNextMonth: ()=>void
    refetch: ()=>void
}

function getMonthBounds(year:number, month: number):{from:string, to:string}{
    const from = new Date(year, month, 1)
    const to = new Date(year, month+1, 0)

    return{
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
    }
}

export function useCalendarOccurrences(): UseCalendarOccurrencesReturn{
    const now = new Date()
    const [displayYear, setDisplayYear] = useState(now.getFullYear())
    const [displayMonth, setDisplayMonth] = useState(now.getMonth())
    const [occurrences, setOccurrences] = useState<CalendarOccurrence[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchOccurrences = useCallback(async(year: number, month:number)=>{
        setLoading(true)
        setError(null)

        try{
            const {from,to} = getMonthBounds(year, month)
            const response  = await getUpcomingOccurrences({
                from,
                to,
                status: 'PENDING,OVERDUE',
                perPage: 100,
            })

            const raw = response as {data:{data: CalendarOccurrence[]; meta: unknown}}
            const items = raw?.data?.data ?? []

            const normalised = items.map((o)=>({
                ...o,
                amountDue: Number(o.amountDue),
            }))

            setOccurrences(normalised)
        }
        catch(error){
            setError(error instanceof Error ? error.message: 'Failed to load calendar data')
            setOccurrences([])
        }
        finally{
            setLoading(false)
        }
    }, [])

    useEffect(()=>{
        void fetchOccurrences(displayYear, displayMonth)
    },[displayYear, displayMonth, fetchOccurrences])
    
    const goToPreviousMonth = useCallback(()=>{
        setDisplayYear((y)=> (displayMonth === 0? y - 1 : y))
        setDisplayMonth((m)=> (m === 0? 11 : m - 1))
    },[displayMonth])
    
    const goToNextMonth = useCallback(()=>{
        setDisplayYear((y)=> (displayMonth === 11? y + 1 : y))
        setDisplayMonth((m)=> (m === 11? 0 : m + 1))
    },[displayMonth])
    
    const refetch = useCallback(()=>{
        void fetchOccurrences(displayYear, displayMonth)
    },[fetchOccurrences, displayYear, displayMonth])
    
    return{
        occurrences,
        loading,
        error,
        displayYear,
        displayMonth,
        goToPreviousMonth,
        goToNextMonth,
        refetch,
    }
}