import {ChevronDown,ChevronUp} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {GuidanceMascot} from './GuidanceMascot'
import {GuideSlot} from './GuideSlot'
import {useGuidance,useGuidanceOptional} from '@/features/guidance/useGuidance'
import {canAutoExpand,markAutoExpanded} from '@/features/guidance/guidanceLocalDay'
import {formatCurrencyTotals} from '@/features/guidance/guidanceMoney'
import {useDailyGuidance} from '@/hooks/useDailyGuidance'
import {cn} from '@/lib/utils'
import type {GuideFacts} from '@/features/guidance/guidanceTypes'

export interface DashboardDailyGuideProps{
    payableCount?:number
    storage?:Storage|null
    className?:string
}

export function DashboardDailyGuide(props:DashboardDailyGuideProps){
    const guidance=useGuidanceOptional()
    if(!guidance) return null
    return <DailyGuidePanel {...props}/>
}

function DailyGuidePanel({
    payableCount,
    storage,
    className,
}:DashboardDailyGuideProps){
    const {state,userId,localDate,storage:providerStorage}=useGuidance()
    const {status,data,refresh}=useDailyGuidance()
    const markerStorage=storage===undefined? providerStorage : storage

    const [expanded,setExpanded]=useState(false)
    const [openedManually,setOpenedManually]=useState(false)

    const autoExpansionAllowed=state.tipsEnabled&&state.dailyExpansionEnabled

    useEffect(()=>{
        if(!autoExpansionAllowed||status==='loading') return
        if(!canAutoExpand(userId,localDate,markerStorage)) return
        markAutoExpanded(userId,localDate,markerStorage)
        setExpanded(true)
    },[autoExpansionAllowed,status,userId,localDate,markerStorage])

    const facts=useMemo<GuideFacts>(()=>{
        if(status==='unavailable') return {factsUnavailable:true}
        if(!data) return {}
        return{
            factsUnavailable:false,
            contributionCount:data.payments.contributionCount,
            completedOccurrenceCount:data.payments.completedOccurrenceCount,
            amount:formatCurrencyTotals(data.payments.totalsByCurrency),
            dailyQuizStatus:data.dailyQuiz.status,
            paymentStreak:data.streaks.payment,
            knowledgeStreak:data.streaks.knowledge,
            ...(payableCount===undefined? {} : {payableCount}),
        }
    },[status,data,payableCount])

    return(
        <section
            aria-labelledby="daily-guide-heading"
            className={cn(
                'rounded-2xl border-2 border-[#091828] bg-white dark:border-[#2d3449] dark:bg-[#131b2e]',
                className,
            )}
        >
            <button
                type="button"
                aria-expanded={expanded}
                aria-controls="daily-guide-panel"
                onClick={()=>{
                    setExpanded((open)=>!open)
                    setOpenedManually(true)
                }}
                className="flex w-full items-center gap-3 p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
            >
                <GuidanceMascot className="size-10"/>
                <span
                    id="daily-guide-heading"
                    className="flex-1 text-sm font-bold text-[#091828] dark:text-[#dae2fd]"
                >
                    Today&rsquo;s guide
                </span>
                {expanded
                    ? <ChevronUp aria-hidden="true" className="size-4 text-[#6B6375] dark:text-[#a0aec0]"/>
                    : <ChevronDown aria-hidden="true" className="size-4 text-[#6B6375] dark:text-[#a0aec0]"/>}
            </button>

            {expanded && (
                <div id="daily-guide-panel" className="px-4 pb-4">
                    {status==='loading'
                        ? (
                            <p className="text-sm text-[#6B6375] dark:text-[#a0aec0]">
                                Checking today&rsquo;s activity&hellip;
                            </p>
                        )
                        : (
                            <GuideSlot
                                surface="dashboard"
                                facts={facts}
                                onRetry={refresh}
                                manual={openedManually}
                                showAvatar={false}
                            />
                        )}
                </div>
            )}
        </section>
    )
}