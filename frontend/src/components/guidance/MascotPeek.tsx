import {useEffect,useState} from 'react'
import {GuidanceMascot} from './GuidanceMascot'
import {GuideSlot} from './GuideSlot'
import {useGuidanceOptional} from '@/features/guidance/useGuidance'
import {cn} from '@/lib/utils'
import type {GuidanceSurface,GuideFacts} from '@/features/guidance/guidanceTypes'

export const PEEK_DURATION_MS=10_000

export interface MascotPeekProps{
    surface:GuidanceSurface
    facts:GuideFacts
    side?:'left'|'right'
    onRetry?:()=>void
    onContinue?:()=>void
    manual?:boolean
    durationMs?:number|null
    className?:string
}

export function MascotPeek(props:MascotPeekProps){
    const guidance=useGuidanceOptional()
    if(!guidance) return null
    return <Peek {...props}/>
}

function Peek({surface,facts,side='right',onRetry,onContinue,manual,durationMs=PEEK_DURATION_MS,className}:MascotPeekProps){
    const fromLeft=side==='left'
    const [expired,setExpired]=useState(false)
    const factsKey=JSON.stringify(facts)

    useEffect(()=>{
        setExpired(false)
        if(durationMs===null) return
        const timer=window.setTimeout(()=>setExpired(true),durationMs)
        return ()=>window.clearTimeout(timer)
    },[surface,factsKey,durationMs])

    if(expired) return null

    return(
        <div
            className={cn(
                'pointer-events-none fixed bottom-24 z-30 flex flex-col gap-3',
                fromLeft? 'left-0 items-start' : 'right-0 items-end',
                className,
            )}
        >
            <GuideSlot
                surface={surface}
                facts={facts}
                onRetry={onRetry}
                onContinue={onContinue}
                manual={manual}
                variant="bubble"
                bubbleTail={side}
                showAvatar={false}
                className={cn('pointer-events-auto',fromLeft? 'ml-3' : 'mr-3')}
            />

            <div className={cn('w-36 overflow-hidden',fromLeft? 'rounded-r-3xl' : 'rounded-l-3xl')}>
                <div className={fromLeft? '-translate-x-2 translate-y-4 rotate-[45deg]' : 'translate-x-2 translate-y-4 rotate-[-45deg]'}>
                    <GuidanceMascot className={cn('size-80',!fromLeft&&'-scale-x-100')}/>
                </div>
            </div>
        </div>
    )
}