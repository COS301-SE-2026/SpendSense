import {ChevronLeft} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {GuidanceMascot} from './GuidanceMascot'
import {GuideSlot} from './GuideSlot'
import {useGuidance,useGuidanceOptional} from '@/features/guidance/useGuidance'
import {canAutoExpand,markAutoExpanded} from '@/features/guidance/guidanceLocalDay'
import {formatCurrencyTotals} from '@/features/guidance/guidanceMoney'
import {useDailyGuidance} from '@/hooks/useDailyGuidance'
import {cn} from '@/lib/utils'
import type {GuideFacts} from '@/features/guidance/guidanceTypes'

export interface MascotGuideDockProps{
    payableCount?:number
    storage?:Storage|null
    className?:string
}

export function MascotGuideDock(props:MascotGuideDockProps){
    const guidance=useGuidanceOptional()
    if(!guidance) return null
    return <GuideDock {...props}/>
}

function GuideDock({payableCount,storage,className}:MascotGuideDockProps){
    const {state,userId,localDate,storage:providerStorage,walkthroughVisible}=useGuidance()
    const {status,data,refresh}=useDailyGuidance()
    const markerStorage=storage===undefined? providerStorage : storage

    const [offScreen,setOffScreen]=useState(false)
    const [bubbleOpen,setBubbleOpen]=useState(false)
    const [openedManually,setOpenedManually]=useState(false)

    const autoOpenAllowed=state.tipsEnabled&&state.dailyExpansionEnabled

    useEffect(()=>{

        if(!autoOpenAllowed||status==='loading') return
        if(!canAutoExpand(userId,localDate,markerStorage)) return
        markAutoExpanded(userId,localDate,markerStorage)
        setBubbleOpen(true)
    },[autoOpenAllowed,status,userId,localDate,markerStorage])

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

    if(walkthroughVisible) return null

    if(offScreen){
        return(
            <button
                type="button"
                aria-label="Bring your mascot guide back"
                onClick={()=>{
                    setOffScreen(false)
                    setBubbleOpen(true)
                    setOpenedManually(true)
                }}
                className={cn(
                    'fixed right-0 bottom-28 z-30 flex items-center gap-0.5 rounded-l-2xl border-2 border-r-0 border-[#091828] bg-white py-1.5 pl-1.5 pr-1',
                    'dark:border-[#2d3449] dark:bg-[#131b2e]',
                    className,
                )}
            >
                <ChevronLeft aria-hidden="true" className="size-4 text-[#6B6375] dark:text-[#a0aec0]"/>
                <GuidanceMascot className="size-8"/>
            </button>
        )
    }

    return(
        <div
            className={cn(
                'fixed right-4 bottom-24 z-30 flex flex-col items-end gap-2',
                className,
            )}
        >
            {bubbleOpen && status!=='loading' && (
                <GuideSlot
                    surface="dashboard"
                    facts={facts}
                    onRetry={refresh}
                    manual={openedManually}
                    variant="bubble"
                    showAvatar={false}
                />
            )}

            <button
                type="button"
                aria-label="Hide your mascot guide"
                onClick={()=>{
                    setOffScreen(true)
                    setBubbleOpen(false)
                }}
                className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
            >
                <GuidanceMascot className="size-16"/>
            </button>
        </div>
    )
}