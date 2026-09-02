import {useState, useCallback, useEffect} from 'react'
import {getUpcomingOccurrences} from '@/features/payments/paymentsApi'
import type {CalendarOccurrence} from '@/hooks/useCalendarOccurrences'


const ALL_STATUSES = 'PENDING,OVERDUE,MISSED,PAID,PAID_LATE,CANCELLED'

const MONTHS_BACK = 12
const MONTHS_FORWARD = 24

const PER_PAGE = 100
const MAX_PAGES = 10

export interface ScheduledPaymentMonth{
    key: string
    label: string
    occurrences: CalendarOccurrence[]
    total: number
}

interface UseScheduledPaymentsReturn{
    months: ScheduledPaymentMonth[]
    loading: boolean
    error: string|null
    refetch: ()=>void
}

interface UpcomingResponse{
    data:{
        data: CalendarOccurrence[]
        meta?: {totalPages?: number}
    }
}

function toDateKey(date: Date): string{
    const month = String(date.getUTCMonth() + 1).padStart(2,'0')
    const day = String(date.getUTCDate()).padStart(2,'0')
    return `${date.getUTCFullYear()}-${month}-${day}`
}

export function monthLabel(key: string): string{
    const [year, month] = key.split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-ZA',{
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    })
}

export function getMonthKey(date: Date): string{
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2,'0')}`
}

export function findAnchorMonthKey(
    months: {key: string}[],
    today: Date,
): string|null{
    const currentKey = getMonthKey(today)
    if(months.some((month)=> month.key === currentKey)) return currentKey
 
    const upcoming = months.find((month)=> month.key > currentKey)
    if(upcoming) return upcoming.key
 
    return months[months.length - 1]?.key ?? null
}

export function getScheduleWindow(today: Date): {from: string; to: string}{
    const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - MONTHS_BACK, 1))
    const to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + MONTHS_FORWARD + 1, 0))
 
    return {from: toDateKey(from), to: toDateKey(to)}
}

export function groupByMonth(occurrences: CalendarOccurrence[]): ScheduledPaymentMonth[]{
    const buckets = new Map<string, CalendarOccurrence[]>()
 
    for(const occurrence of occurrences){
        const due = new Date(occurrence.dueDate)
        const key = getMonthKey(due)
 
        const existing = buckets.get(key)
        if(existing) existing.push(occurrence)
        else buckets.set(key, [occurrence])
    }
 
    return [...buckets.entries()]
        .sort(([a],[b])=> a.localeCompare(b))
        .map(([key, items])=> {
            const label = monthLabel(key)
 
            const sorted = [...items].sort(
                (a,b)=> new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
            )
 
            return {
                key,
                label,
                occurrences: sorted,
                total: sorted.reduce(
                    (sum, item)=> item.status === 'CANCELLED' ? sum : sum + Number(item.amountDue),
                    0,
                ),
            }
        })
}

export function withCurrentMonth(
    months: ScheduledPaymentMonth[],
    today: Date,
): ScheduledPaymentMonth[]{
    if(months.length === 0) return months
 
    const key = getMonthKey(today)
    if(months.some((month)=> month.key === key)) return months
 
    const placeholder: ScheduledPaymentMonth = {
        key,
        label: monthLabel(key),
        occurrences: [],
        total: 0,
    }
 
    return [...months, placeholder].sort((a,b)=> a.key.localeCompare(b.key))
}



export function useScheduledPayments(): UseScheduledPaymentsReturn{
    const [months, setMonths] = useState<ScheduledPaymentMonth[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string|null>(null)
 
    const fetchAll = useCallback(async()=>{
        setLoading(true)
        setError(null)
 
        try{
            const {from, to} = getScheduleWindow(new Date())
            const collected: CalendarOccurrence[] = []
 
            let page = 1
            let totalPages = 1
 
            while(page <= totalPages && page <= MAX_PAGES){
                const response = await getUpcomingOccurrences({
                    from,
                    to,
                    status: ALL_STATUSES,
                    page,
                    perPage: PER_PAGE,
                }) as UpcomingResponse
 
                const items = response?.data?.data ?? []
                collected.push(...items.map((item)=>({...item, amountDue: Number(item.amountDue)})))
 
                totalPages = response?.data?.meta?.totalPages ?? 1
                page += 1
            }
 
            setMonths(withCurrentMonth(groupByMonth(collected), new Date()))
        }
        catch(err){
            setError(err instanceof Error ? err.message : 'Failed to load scheduled payments')
            setMonths([])
        }
        finally{
            setLoading(false)
        }
    }, [])
 
    useEffect(()=>{
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchAll()
    }, [fetchAll])
 
    return {months, loading, error, refetch: fetchAll}
}