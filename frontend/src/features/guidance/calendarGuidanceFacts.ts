import type {CalendarOccurrence} from '@/hooks/useCalendarOccurrences'
import type {GuideFacts} from './guidanceTypes'

const PAYABLE_STATUSES=['PENDING','OVERDUE']

export function calendarGuidanceFacts(
    occurrences:readonly CalendarOccurrence[],
    visible:readonly CalendarOccurrence[],
    options:{loading:boolean;error:string|null},
):GuideFacts{
    if(options.loading||options.error) return {}

    const facts:GuideFacts={
        obligationCount:occurrences.length,
        isOverdue:visible.some((occurrence)=>occurrence.status==='OVERDUE'),
    }

    const payable=visible.filter((occurrence)=>PAYABLE_STATUSES.includes(occurrence.status))
    if(payable.length===1){
        facts.isPayable=true
        facts.dueDate=formatDueDate(payable[0].dueDate)
        facts.paidMinorUnits=0
    }

    return facts
}

export function formatDueDate(iso:string):string|undefined{
    const date=new Date(iso)
    if(Number.isNaN(date.getTime())) return undefined
    return date.toLocaleDateString('en-ZA',{day:'numeric',month:'long'})
}