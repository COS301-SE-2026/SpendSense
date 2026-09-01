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

const CALENDAR_STATUSES = 'PENDING,OVERDUE,MISSED,PAID,PAID_LATE'

function toDateKey(date: Date): string{
    const month = String(date.getMonth() + 1).padStart(2,'0')
    const day = String(date.getDate()).padStart(2,'0')
    return `${date.getFullYear()}-${month}-${day}`
}

export function getMonthBounds(year:number, month: number):{from:string, to:string}{
    const from = new Date(year, month, 1)
    const to = new Date(year, month+1, 0)

    return{
        from: toDateKey(from),
        to: toDateKey(to),
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
                status: CALENDAR_STATUSES,
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
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchOccurrences(displayYear, displayMonth)
    },[displayYear, displayMonth, fetchOccurrences])
    
    const goToPreviousMonth = ()=>{
        setDisplayMonth((m)=>{
            if(m === 0){
                setDisplayYear((y)=> y - 1)
                return 11
            }
            return m - 1
        })
    }

    const goToNextMonth = ()=>{
        setDisplayMonth((m)=>{
            if(m === 11){
                setDisplayYear((y)=> y + 1)
                return 0
            }
            return m + 1
        })
    }
    
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