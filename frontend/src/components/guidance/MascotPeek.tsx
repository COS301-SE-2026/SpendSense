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

export function MascotPeek(props:Readonly<MascotPeekProps>){
    const guidance=useGuidanceOptional()
    if(!guidance) return null
    return <Peek {...props}/>
}

function Peek({surface,facts,side='right',onRetry,onContinue,manual,durationMs=PEEK_DURATION_MS,className}:Readonly<MascotPeekProps>){
    const fromLeft=side==='left'
    // a new surface, set of facts or duration starts a fresh peek
    const peekKey=`${surface}|${JSON.stringify(facts)}|${durationMs}`
    const [expiredKey,setExpiredKey]=useState<string|null>(null)

    useEffect(()=>{
        if(durationMs===null) return
        const timer=window.setTimeout(()=>setExpiredKey(peekKey),durationMs)
        return ()=>window.clearTimeout(timer)
    },[peekKey,durationMs])

    if(expiredKey===peekKey) return null

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

            {/* the left side is the right side mirrored, so the mascot is cut off at the screen edge */}
            <div className={cn('h-52 w-36 overflow-hidden rounded-l-3xl',fromLeft&&'-scale-x-100')}>
                <div className="translate-x-2 translate-y-4 rotate-[-45deg]">
                    <GuidanceMascot className="size-80 -scale-x-100"/>
                </div>
            </div>
        </div>
    )
}